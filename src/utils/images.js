const { cleanInput, isHttpUrl } = require("./text");

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

module.exports = {
  isImageAttachment,
  readImageOption
};
