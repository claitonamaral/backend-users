// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./src/database/users.db');

// Criação da tabela
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, senha TEXT)');

    // db.run(`
    //     DROP TABLE reservas
    // `);

    // Criação da tabela de reservas
    db.run(`
        CREATE TABLE IF NOT EXISTS reservas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quadraTipo TEXT,
        quadraNumero TEXT,
        horario TEXT,
        duracao INTEGER,
        valor REAL,
        dataReserva DATE
        )
    `);

});

// ...

// Rota para criar uma reserva
app.post('/reservas', (req, res) => {
    const { quadraTipo, quadraNumero, horario, duracao, dataReserva } = req.body;

    // Validar entrada
    if (!quadraTipo || !quadraNumero || !horario || !duracao || !dataReserva) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // Verificar se a quadra já foi reservada na mesma data e horário
    const verificaReservaQuery = `
      SELECT COUNT(*) as count
      FROM reservas
      WHERE quadraTipo = ? AND quadraNumero = ? AND horario = ? AND dataReserva = ?
    `;

    db.get(verificaReservaQuery, [quadraTipo, quadraNumero, horario, dataReserva], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (row.count > 0) {
            return res.json({ message: 'Essa quadra já foi reservada para o mesmo horário e data.' });
            //return res.status(400).json({ error: 'Essa quadra já foi reservada para o mesmo horário e data.' });
        }

        // Calcular o valor da reserva (considerando, por exemplo, R$ 10 por hora)
        const valor = duracao * 100;

        // Inserir reserva no banco de dados
        const query = `
        INSERT INTO reservas (quadraTipo, quadraNumero, horario, duracao, valor, dataReserva)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

        db.run(query, [quadraTipo, quadraNumero, horario, duracao, valor, dataReserva], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                success: true,
                reservaId: this.lastID,
            });
        });
    });
});


// Rota para listar reservas
app.get('/reservas', (req, res) => {
    // Selecionar todas as reservas do banco de dados
    const query = 'SELECT * FROM reservas';

    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Calcular o valor total de cada reserva
        const reservasComValor = rows.map((reserva) => {
            const valorTotal = reserva.valor || reserva.duracao * 100; // Se o valor não estiver armazenado, recalcular
            return { ...reserva, valorTotal };
        });

        res.json(reservasComValor);
    });
});

// Rotas CRUD
app.get('/users', (req, res) => {
    db.all('SELECT * FROM users', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/users', (req, res) => {
    const { name, email, senha } = req.body;
    db.run('INSERT INTO users (name, email, senha) VALUES (?, ?, ?)', [name, email, senha], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'User added successfully' });
    });
});

app.put('/users/:id', (req, res) => {
    const { name, email, senha } = req.body;
    const id = req.params.id;
    db.run('UPDATE users SET name=?, email=?, senha=? WHERE id=?', [name, email, senha, id], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'User updated successfully' });
    });
});

app.delete('/users/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM users WHERE id=?', id, (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'User deleted successfully' });
    });
});

// Rota de login
app.post('/login', (req, res) => {
    const { email, senha } = req.body;

    // Consulta SQL para verificar o usuário e senha
    const query = 'SELECT * FROM users WHERE email = ? AND senha = ?';

    db.get(query, [email, senha], (err, row) => {
        if (err) {
            console.error('Erro ao verificar usuário e senha:', err);
            res.status(500).json({ message: 'Erro interno ao verificar usuário e senha.' });
        } else if (row) {
            res.status(200).json({ message: 'Login bem-sucedido' });
        } else {
            res.status(401).json({ message: 'Credenciais inválidas' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});