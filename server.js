const express = require('express');
const https = require('https'); // https modülünü dahil ediyoruz
const WebSocket = require('ws');
const fs = require('fs'); // dosya okuma için fs modülünü ekliyoruz
const path = require('path');
const { generateRandomString } = require("./utils/utils");

const app = express();
const port = 3000;
const wss = new WebSocket.Server({ noServer: true });

const users = {};

// Sertifikaları oku
const options = {
    key: fs.readFileSync(path.resolve(__dirname, 'server.key')),
    cert: fs.readFileSync(path.resolve(__dirname, 'server.cert'))
};

// WebSocket bağlantılarını güncelleme
function broadcastUserList() {
    const userList = Object.keys(users);
    const message = JSON.stringify({ type: "user-list", users: userList });

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

wss.on('connection', (ws) => {
    const userID = generateRandomString(); // 7 karakterli bir ID oluştur
    users[userID] = ws;

    // Bağlanan kullanıcının ID'sini gönder
    ws.send(JSON.stringify({ type: "register", userID }));

    broadcastUserList();

    ws.on('message', (message) => { // mesaj dinleniyor
        const data = JSON.parse(message);

        if (data.target && users[data.target]) { // mesaj hedefe iletiliyor.
            users[data.target].send(JSON.stringify(data));
        }
    });

    ws.on('close', () => {
        // Bağlantısı kesilen kullanıcıyı users objesinden sil
        delete users[userID];
        broadcastUserList();
    });
});

// HTTPS sunucusunu oluşturma
const server = https.createServer(options, app);

// WebSocket'i HTTPS sunucusuna yönlendirme
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Yerel IP adresini belirleme
const ipAddress = '10.57.24.140'; // Herkesin erişebileceği şekilde IP adresi


// HTTPS sunucusunu başlatma
server.listen(port, ipAddress, () => {
    console.log(`Server running at https://${ipAddress}:${port}`);
});

// public klasöründeki dosyaları statik olarak sunma
app.use(express.static(path.join(__dirname, 'public')));

// Ana sayfa isteğini dinliyor ve index.html dosyasını döndürüyor.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
