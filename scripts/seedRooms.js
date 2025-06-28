const mongoose = require('mongoose');
const Room = require('../models/Room'); // '../models/Room' car scripts est dans un dossier à côté de models

async function main() {
  await mongoose.connect('mongodb://localhost:27017/chat-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const rooms = [
    { name: 'Général', description: 'Salon général pour tous.' },
    { name: 'Développement', description: 'Discussions techniques.' },
    { name: 'Détente', description: 'Salon détente.' },
  ];

  try {
    await Room.deleteMany({});
    await Room.insertMany(rooms);
    console.log('Rooms seedées avec succès ✅');
  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    mongoose.connection.close();
  }
}

main();
