const { cleanInput } = require("./text");

function normalizeChannelId(value) {
  return cleanInput(value).replace(/[<#>]/g, "");
}

async function resolveSendableChannel(interaction) {
  const channelId = normalizeChannelId(interaction.options.getString("canal_id"));
  const selectedChannel = interaction.options.getChannel("canal");
  const channel = channelId
    ? await interaction.guild.channels.fetch(channelId).catch(() => null)
    : selectedChannel || interaction.channel;

  if (!channel || !channel.isTextBased() || typeof channel.send !== "function") {
    return {
      error: "Elige un canal de texto valido o pega su ID en canal_id."
    };
  }

  return { channel };
}

module.exports = {
  normalizeChannelId,
  resolveSendableChannel
};
