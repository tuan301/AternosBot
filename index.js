const mineflayer = require('mineflayer');
const log4js = require("log4js");

log4js.configure({
    appenders: {
        console: { type: "console" },
    },
    categories: {
        default: {
            appenders: ["console"],
            level: "info"
        }
    },
    layouts: {
        customLayout: {
            type: 'pattern',
            pattern: '%d{hh:mm:ss} %-5p %c - %m',
        }
    }
});

const logger = log4js.getLogger();

let reconnectAttempts = 0;

const config = {
  utils: {
    'auto-auth': {
      enabled: true,
      password: 'tuandeptrai'
    },
    'chat-messages': {
      enabled: true,
      messages: [
        '/tpsbar @a',
      ],
      repeat: true,
      'repeat-delay': 10
    },
    'auto-reconnect': true,
    'auto-reconnect-delay': 5000
  }
};

function createBot() {
  return mineflayer.createBot({
    host: '5.223.45.53',
    port: 25134,
    username: 'Griffith',
    version: '1.16.5',
    auth: 'offline'
  });
}

let bot = createBot();

bot.on('login', () => {
  logger.info('Bot has logged in.');
});

bot.on('spawn', () => {
  logger.info('Bot has spawned.');
  try {
    const dimension = bot.registry.dimensionsByName[bot.game.dimension];
    if (!dimension) {
      throw new Error(`Dimension data is not available for: ${bot.game.dimension}`);
    }
    const { minY, height } = dimension;
    logger.info(`Loaded dimension: ${bot.game.dimension} (minY: ${minY}, height: ${height})`);
  } catch (error) {
    logger.error('Error accessing world data:', error.message, ", don't worry. The bot just can't find the dimension it is in.");
    logger.info('Using fallback world data.');
  }
});

bot.on('death', () => {
  setTimeout(() => {
    if (bot.entity && bot.entity.position) {
      logger.warn(`Bot has died and was respawned at ${bot.entity.position}`);
    } else {
      logger.warn('Bot has died but position is not available.');
    }
  }, 1000);
});

if (config.utils['auto-reconnect']) {
  bot.on('end', () => {
    setTimeout(() => {
      bot = createBot();
    }, config.utils['auto-reconnect-delay']);
  });
}

bot.on('kicked', (reason) => {
  if (typeof reason !== 'string') {
    logger.error('Kick reason is not a string:', reason);
    return;
  }

  try {
    let reasonText;
    try {
      const parsedReason = JSON.parse(reason);
      reasonText = parsedReason.text || '';
      if (!reasonText) {
        reasonText = (parsedReason.extra && parsedReason.extra[0] && parsedReason.extra[0].text) || '';
      }
    } catch (jsonError) {
      logger.error('Failed to parse kick reason JSON:', jsonError.message);
      reasonText = reason;
    }
    
    reasonText = reasonText.replace(/§./g, '');
    logger.warn(`Bot was kicked from the server. Reason: ${reasonText}`);
  } catch (error) {
    logger.error('Failed to process kick reason:', error.message);
  }
});

bot.on('error', (err) => {
  logger.error(`${err.message}`);
});

bot.once('spawn', () => {
  logger.info("Bot joined to the server");

  if (config.utils['auto-auth'].enabled) {
    logger.info('Started auto-auth module');

    let password = config.utils['auto-auth'].password;
    setTimeout(() => {
      bot.chat(`/register ${password} ${password}`);
      bot.chat(`/login ${password}`);
    }, 500);

    logger.info('Authentication commands executed');
  }

  if (config.utils['chat-messages'].enabled) {
    logger.info('Started chat-messages module');

    let messages = config.utils['chat-messages']['messages'];

    if (config.utils['chat-messages'].repeat) {
      let delay = config.utils['chat-messages']['repeat-delay'];
      let i = 0;

      setInterval(() => {
        bot.chat(`${messages[i]}`);

        if (i + 1 === messages.length) {
          i = 0;
        } else {
          i++;
        }
      }, delay * 1000);
    } else {
      messages.forEach((msg) => {
        bot.chat(msg);
      });
    }
  }
});
