const express = require('express');
const app = express();
const authRoutes = require('./routes/auth');
const projetRoutes = require('./routes/projet');

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projets', projetRoutes);

app.listen(3000, () => console.log('Serveur lancé sur http://localhost:3000'));
