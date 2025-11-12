const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Permission = require('../models/Permission');

  const allPerms = await Permission.find({}).sort({ name: 1 });

  console.log(`\n📊 Total permissions in DB: ${allPerms.length}\n`);

  const grouped = {};
  allPerms.forEach(p => {
    if (p.name.includes('DELETE')) {
      if (!grouped.DELETE) grouped.DELETE = [];
      grouped.DELETE.push(p.name);
    } else if (p.name.includes('DEACTIVATE')) {
      if (!grouped.DEACTIVATE) grouped.DEACTIVATE = [];
      grouped.DEACTIVATE.push(p.name);
    } else if (p.name.includes('VIEW') && p.name.includes('SENSITIVE')) {
      if (!grouped.SENSITIVE) grouped.SENSITIVE = [];
      grouped.SENSITIVE.push(p.name);
    } else if (p.name.includes('COMPLETE')) {
      if (!grouped.SPECIAL) grouped.SPECIAL = [];
      grouped.SPECIAL.push(p.name);
    } else {
      const op = p.name.split('_')[1];
      if (!grouped[op]) grouped[op] = [];
      grouped[op].push(p.name);
    }
  });

  Object.keys(grouped).sort().forEach(key => {
    console.log(`${key}: ${grouped[key].length}`);
    grouped[key].forEach(name => console.log(`  - ${name}`));
    console.log('');
  });

  process.exit(0);
});
