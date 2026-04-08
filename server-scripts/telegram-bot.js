/**
 * Telegram Bot для управления MTProto прокси
 * 
 * Установка на сервере:
 * 1. npm install telegraf
 * 2. Установите переменные окружения:
 *    - BOT_TOKEN: токен от @BotFather
 *    - ADMIN_API_URL: URL вашей админ-панели (например https://your-app.vercel.app)
 *    - ADMIN_IDS: список Telegram ID администраторов через запятую
 * 3. node telegram-bot.js
 */

const { Telegraf, Markup } = require('telegraf')

const BOT_TOKEN = process.env.BOT_TOKEN
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:3000'
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim())

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN не установлен')
  process.exit(1)
}

const bot = new Telegraf(BOT_TOKEN)

// Проверка администратора
const isAdmin = (ctx) => {
  const userId = ctx.from.id.toString()
  return ADMIN_IDS.includes(userId)
}

// Middleware для проверки админа
const adminOnly = (ctx, next) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('У вас нет доступа к этому боту.')
  }
  return next()
}

bot.use(adminOnly)

// Команда /start
bot.start((ctx) => {
  ctx.reply(
    'Добро пожаловать в MTProxy Manager Bot!\n\n' +
    'Доступные команды:\n' +
    '/proxies - Список всех прокси\n' +
    '/active - Список активных прокси\n' +
    '/stats - Статистика\n' +
    '/rotate <id> - Ротация секрета прокси\n' +
    '/rotate_all - Ротация всех секретов',
    Markup.keyboard([
      ['📋 Список прокси', '📊 Статистика'],
      ['🔄 Ротация всех']
    ]).resize()
  )
})

// Команда /proxies или кнопка
bot.command('proxies', handleListProxies)
bot.hears('📋 Список прокси', handleListProxies)

async function handleListProxies(ctx) {
  try {
    const response = await fetch(`${ADMIN_API_URL}/api/proxies`)
    const data = await response.json()
    
    if (!data.success || data.data.length === 0) {
      return ctx.reply('Нет добавленных прокси')
    }
    
    for (const proxy of data.data) {
      const status = proxy.status === 'active' ? '🟢' : '🔴'
      const message = 
        `${status} *${escapeMarkdown(proxy.name)}*\n` +
        `📍 Сервер: \`${proxy.server_ip}:${proxy.port}\`\n` +
        `🔑 Секрет: \`${proxy.secret.substring(0, 8)}...\`\n\n` +
        `[Подключиться](${proxy.tg_link})`
      
      await ctx.replyWithMarkdown(message, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Ротация', callback_data: `rotate_${proxy.id}` },
              { text: '📋 Копировать ссылку', callback_data: `link_${proxy.id}` }
            ]
          ]
        }
      })
    }
  } catch (error) {
    console.error('Error fetching proxies:', error)
    ctx.reply('Ошибка получения списка прокси')
  }
}

// Команда /active
bot.command('active', async (ctx) => {
  try {
    const response = await fetch(`${ADMIN_API_URL}/api/proxies?active=true`)
    const data = await response.json()
    
    if (!data.success || data.data.length === 0) {
      return ctx.reply('Нет активных прокси')
    }
    
    let message = '*Активные прокси:*\n\n'
    for (const proxy of data.data) {
      message += `🟢 *${escapeMarkdown(proxy.name)}*\n`
      message += `[Подключиться](${proxy.tg_link})\n\n`
    }
    
    ctx.replyWithMarkdown(message)
  } catch (error) {
    console.error('Error fetching active proxies:', error)
    ctx.reply('Ошибка получения активных прокси')
  }
})

// Команда /stats или кнопка
bot.command('stats', handleStats)
bot.hears('📊 Статистика', handleStats)

async function handleStats(ctx) {
  try {
    const response = await fetch(`${ADMIN_API_URL}/api/stats`)
    const data = await response.json()
    
    if (!data.success) {
      return ctx.reply('Ошибка получения статистики')
    }
    
    const stats = data.data.proxies
    const lastRotation = stats.lastRotation 
      ? new Date(stats.lastRotation).toLocaleString('ru-RU')
      : 'Никогда'
    
    const message = 
      '*📊 Статистика прокси*\n\n' +
      `Всего: ${stats.total}\n` +
      `🟢 Активных: ${stats.active}\n` +
      `🔴 Неактивных: ${stats.inactive}\n` +
      `🟡 В ротации: ${stats.rotating}\n\n` +
      `🔄 Последняя ротация: ${lastRotation}`
    
    ctx.replyWithMarkdown(message)
  } catch (error) {
    console.error('Error fetching stats:', error)
    ctx.reply('Ошибка получения статистики')
  }
}

// Команда /rotate <id>
bot.command('rotate', async (ctx) => {
  const args = ctx.message.text.split(' ')
  if (args.length < 2) {
    return ctx.reply('Использование: /rotate <id прокси>')
  }
  
  const proxyId = args[1]
  await rotateProxy(ctx, proxyId)
})

// Команда /rotate_all или кнопка
bot.command('rotate_all', handleRotateAll)
bot.hears('🔄 Ротация всех', handleRotateAll)

async function handleRotateAll(ctx) {
  try {
    ctx.reply('Выполняется ротация всех секретов...')
    
    const response = await fetch(`${ADMIN_API_URL}/api/proxies/rotate-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ use_fake_tls: true })
    })
    
    const data = await response.json()
    
    if (data.success) {
      ctx.reply(`✅ ${data.message}`)
    } else {
      ctx.reply(`❌ Ошибка: ${data.error}`)
    }
  } catch (error) {
    console.error('Error rotating all:', error)
    ctx.reply('Ошибка при ротации секретов')
  }
}

// Callback для инлайн кнопок
bot.action(/rotate_(\d+)/, async (ctx) => {
  const proxyId = ctx.match[1]
  await ctx.answerCbQuery('Ротация...')
  await rotateProxy(ctx, proxyId)
})

bot.action(/link_(\d+)/, async (ctx) => {
  const proxyId = ctx.match[1]
  
  try {
    const response = await fetch(`${ADMIN_API_URL}/api/proxies/${proxyId}`)
    const data = await response.json()
    
    if (data.success) {
      await ctx.answerCbQuery('Ссылка отправлена')
      ctx.reply(data.data.tg_link)
    } else {
      await ctx.answerCbQuery('Ошибка')
    }
  } catch (error) {
    await ctx.answerCbQuery('Ошибка')
  }
})

// Функция ротации прокси
async function rotateProxy(ctx, proxyId) {
  try {
    const response = await fetch(`${ADMIN_API_URL}/api/proxies/${proxyId}/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ use_fake_tls: true })
    })
    
    const data = await response.json()
    
    if (data.success) {
      const proxy = data.data
      const message = 
        `✅ Секрет обновлен!\n\n` +
        `*${escapeMarkdown(proxy.name)}*\n` +
        `🔑 Новый секрет: \`${proxy.secret.substring(0, 8)}...\`\n\n` +
        `[Подключиться](${proxy.tg_link})`
      
      ctx.replyWithMarkdown(message)
    } else {
      ctx.reply(`❌ Ошибка: ${data.error}`)
    }
  } catch (error) {
    console.error('Error rotating proxy:', error)
    ctx.reply('Ошибка при ротации секрета')
  }
}

// Экранирование Markdown
function escapeMarkdown(text) {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
}

// Запуск бота
bot.launch()
console.log('MTProxy Manager Bot запущен!')

// Опрос изменений из админ панели (Vercel) для VPS
async function startSyncLoop() {
  const fs = require('fs');
  const { execSync } = require('child_process');
  
  console.log('Запуск агента синхронизации конфигураций с Vercel...');
  
  setInterval(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const ipResponse = await fetch('https://ifconfig.me/ip', { signal: controller.signal });
      clearTimeout(timeoutId);
      const externalIp = (await ipResponse.text()).trim();
      
      const response = await fetch(`${ADMIN_API_URL}/api/proxies`);
      const data = await response.json();
      if (!data.success) return;
      
      const myProxy = data.data.find(p => p.server_ip === externalIp);
      if (!myProxy) return; // Этот сервер не найден в БД
      
      const dockerComposePath = '/opt/mtproxy/docker-compose.yml';
      if (!fs.existsSync(dockerComposePath)) return;
      
      let dockerCompose = fs.readFileSync(dockerComposePath, 'utf8');
      
      const matchSecret = dockerCompose.match(/SECRET=([a-zA-Z0-9]+)/);
      const matchPort = dockerCompose.match(/- "(\d+):443"/);
      
      const localSecret = matchSecret ? matchSecret[1] : null;
      const localPort = matchPort ? parseInt(matchPort[1], 10) : null;
      
      if (localSecret !== myProxy.secret || localPort !== myProxy.port) {
         console.log(`[SYNC] Обнаружено изменение. Секрет: ${localSecret} -> ${myProxy.secret}, Порт: ${localPort} -> ${myProxy.port}`);
         
         // Обновление docker-compose.yml
         dockerCompose = dockerCompose.replace(/SECRET=[a-zA-Z0-9]+/, `SECRET=${myProxy.secret}`);
         dockerCompose = dockerCompose.replace(/- "\d+:443"/, `- "${myProxy.port}:443"`);
         fs.writeFileSync(dockerComposePath, dockerCompose);
         
         // Обновление config txt для пользователя
         const configTxtPath = '/opt/mtproxy/proxy-config.txt';
         if (fs.existsSync(configTxtPath)) {
             let cfg = fs.readFileSync(configTxtPath, 'utf8');
             cfg = cfg.replace(/Secret: .*/, `Secret: ${myProxy.secret}`);
             cfg = cfg.replace(/Port: .*/, `Port: ${myProxy.port}`);
             cfg = cfg.replace(/tg:\/\/proxy\?.*/, myProxy.tg_link);
             cfg = cfg.replace(/https:\/\/t\.me\/proxy\?.*/, myProxy.web_link);
             fs.writeFileSync(configTxtPath, cfg);
         }
         
         // Перезапуск контейнера
         execSync('cd /opt/mtproxy && docker-compose up -d', { stdio: 'inherit' });
         console.log('[SYNC] Новая конфигурация успешно применена локально.');
      }
    } catch (e) {
      // Игнорируем сетевые ошибки, чтобы не засорять логи каждые 30 секунд
      if (e.name !== 'AbortError' && !e.message.includes('fetch failed')) {
         console.error('[SYNC ERROR]:', e.message);
      }
    }
  }, 30000);
}

startSyncLoop();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
