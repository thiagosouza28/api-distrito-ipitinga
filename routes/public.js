import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_USER = process.env.EMAIL_USER; // E-mail de envio
const EMAIL_PASS = process.env.EMAIL_PASS; // Senha do e-mail

// Configure o transportador de e-mail para Hotmail
const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
    tls: {
        ciphers: 'SSLv3',
    },
});

// Rota para solicitar redefinição de senha
router.post('/solicitar-redefinicao', async (req, res) => {
    const { email } = req.body;

    const user = await prisma.usuarios.findUnique({ where: { email } });
    if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const resetToken = jwt.sign({ email: user.email }, process.env.RESET_TOKEN_SECRET, { expiresIn: '1h' });
    const resetLink = `http://localhost:3000/redefinir-senha/${resetToken}`;
    
    try {
        await transporter.sendMail({
            from: EMAIL_USER,
            to: email,
            subject: 'Redefinição de Senha',
            text: `Clique no link para redefinir sua senha: ${resetLink}`,
        });
        
        res.json({ message: 'Instruções para redefinição de senha enviadas para o email' });
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        res.status(500).json({ message: 'Erro ao enviar o e-mail' });
    }
});

// Rota para redefinir a senha
router.post('/redefinir-senha/:token', async (req, res) => {
    const { token } = req.params;
    const { novaSenha } = req.body;

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
    } catch (error) {
        return res.status(400).json({ message: 'Token inválido ou expirado' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(novaSenha, salt);

    await prisma.usuarios.update({
        where: { email: decoded.email },
        data: { password: hashPassword },
    });

    res.json({ message: 'Senha redefinida com sucesso' });
});

// Cadastro
router.post('/cadastro-usuarios', async (req, res) => {
    try {
        const { nomecompleto, datanasc, email, cargo, distrito, igreja, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const userDB = await prisma.usuarios.create({
            data: {
                nomecompleto,
                datanasc: new Date(datanasc),
                email,
                cargo,
                distrito,
                igreja,
                password: hashPassword,
            },
        });

        res.status(201).json(userDB);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro no Servidor, tente novamente' });
    }
});


// Rota para cadastro de participantes
router.post('/cadastro-participantes', async (req, res) => {
    try {
        const { cpf, nomecompleto, datanasc, distrito, igreja, confpagamento, datainscricao } = req.body;
        const fotoparticipante = req.files.fotoparticipante;
        const comprovantepag = req.files.comprovantepag;

        // Verificar se os arquivos foram enviados
        if (!fotoparticipante || !comprovantepag) {
            return res.status(400).json({ message: 'Fotos e comprovante são obrigatórios' });
        }

        // Data da inscrição é gerada automaticamente
        const participantDB = await prisma.participantes.create({
            data: {
                cpf,
                fotoparticipante: {
                    create: {
                        filename: fotoparticipante.filename,
                        path: fotoparticipante.path,
                    },
                },
                nomecompleto,
                datanasc: new Date(datanasc), // Formato esperado: YYYY-MM-DD
                distrito,
                igreja,
                comprovantepag: {
                    create: {
                        filename: comprovantepag.filename,
                        path: comprovantepag.path,
                    },
                },
                confpagamento,
                datainscricao: new Date(datainscricao),
            },
        });

        res.status(201).json(participantDB);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro no servidor, tente novamente' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.usuarios.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Senha inválida' });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro no servidor, tente novamente' });
    }
});

export default router;
