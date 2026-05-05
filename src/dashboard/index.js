// 🧠 DASHBOARD
app.get('/dashboard', (req, res) => {

  if (!req.session.user) {
    return res.redirect('/login');
  }

  const user = req.session.user;
  const guilds = req.session.guilds || [];

  // 🔥 Servers donde eres admin
  const adminGuilds = guilds.filter(g => (g.permissions & 0x8) === 0x8);

  // 🔥 IDs donde está el bot
  const botGuildIds = client.guilds.cache.map(g => g.id);

  // 🔥 SOLO servers donde está el bot
  const filteredGuilds = adminGuilds.filter(g => botGuildIds.includes(g.id));

  res.send(`
    <html>
      <body style="background:#111;color:white;font-family:Arial;padding:20px;">

        <h1>WK' Bot Dashboard</h1>

        <img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png"
             width="80"
             style="border-radius:50%">

        <p>Usuario: ${user.username}</p>
        <p>Bot activo ✅</p>
        <p>Servidores (bot): ${client.guilds.cache.size}</p>

        <h2>Servidores donde está el bot</h2>

        <ul>
          ${filteredGuilds.map(g => `
            <li>
              <a href="/server/${g.id}" style="color:#00ffcc;">
                ${g.name}
              </a>
            </li>
          `).join('')}
        </ul>

        <br>
        <a href="/logout" style="color:red;">Cerrar sesión</a>

      </body>
    </html>
  `);
});