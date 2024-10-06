import express from 'express'
import { PrismaClient } from '@prisma/client'

const router = express.Router()

const prisma = new PrismaClient()

router.get('/listar-usuarios', async (req, res) => {
    try {

        const usuarios = await prisma.usuarios.findMany()


        res.status(200).json({ message: 'Usuários listados com sucesso', usuarios })


    } catch (error) {
        res.status(500).json({ message: 'Falha no servidor' })
    }
})


router.get('/listar-participantes', async (req, res) => {
    try {

        const participantes = await prisma.participantes.findMany()


        res.status(200).json({ message: 'Participantes listados com sucesso', participantes })




    } catch (error) {
        res.status(500).json({ message: 'Falha no servidor' })
    }
})



export default router