const crypto = require("node:crypto");

const { cleanInput, isHttpUrl } = require("./text");

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

function isImageAttachment(attachment) {
  if (!attachment) return false;
  if (attachment.contentType) return attachment.contentType.startsWith("image/");
  return /\.(png|jpe?g|gif|webp)$/i.test(attachment.name || attachment.url || "");
}

function readImageOption(interaction, attachmentName, urlName) {
  const attachment = interaction.options.getAttachment(attachmentName);
  const url = cleanInput(interaction.options.getString(urlName));

  if (attachment) {
    if (!isImageAttachment(attachment)) {
      return {
        error: `El archivo de "${attachmentName}" debe ser una imagen.`
      };
    }

    return { url: attachment.url };
  }

  if (url && !isHttpUrl(url)) {
    return {
      error: `La URL de "${urlName}" debe empezar con http o https.`
    };
  }

  return { url };
}

async function captureImageOption(interaction, attachmentName, urlName, prefix = attachmentName) {
  const attachment = interaction.options.getAttachment(attachmentName);
  const url = cleanInput(interaction.options.getString(urlName));

  if (attachment) {
    if (!isImageAttachment(attachment)) {
      return {
        error: `El archivo de "${attachmentName}" debe ser una imagen.`
      };
    }

    if (attachment.size && attachment.size > MAX_IMAGE_BYTES) {
      return {
        error: `La imagen de "${attachmentName}" es demasiado grande. Maximo 25 MB.`
      };
    }

    const response = await fetch(attachment.url);
    if (!response.ok) {
      return {
        error: `No pude guardar la imagen de "${attachmentName}" antes de abrir el formulario.`
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) {
      return {
        error: `La imagen de "${attachmentName}" es demasiado grande. Maximo 25 MB.`
      };
    }

    const originalName = String(attachment.name || "imagen.png");
    const extension = originalName.match(/\.[a-zA-Z0-9]{1,8}$/)?.[0]?.toLowerCase() || ".png";

    return {
      media: {
        type: "attachment",
        fileName: `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}${extension}`,
        buffer
      }
    };
  }

  if (url && !isHttpUrl(url)) {
    return {
      error: `La URL de "${urlName}" debe empezar con http o https.`
    };
  }

  return {
    media: url ? { type: "url", url } : null
  };
}

module.exports = {
  captureImageOption,
  isImageAttachment,
  readImageOption
};
