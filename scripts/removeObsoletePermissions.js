const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Permission = require('../models/Permission');

  console.log('\n🔍 Finding obsolete DELETE permissions...\n');

  const deletePerms = await Permission.find({ name: { $regex: /^CAN_DELETE_/ } });

  if (deletePerms.length === 0) {
    console.log('✅ No obsolete DELETE permissions found\n');
    process.exit(0);
  }

  console.log(`Found ${deletePerms.length} obsolete DELETE permissions:`);
  deletePerms.forEach(p => console.log(`  - ${p.name}`));

  console.log('\n🗑️  Deleting obsolete permissions...\n');

  // Delete directly from collection (bypass pre-hook)
  const result = await mongoose.connection.db.collection('permissions').deleteMany({
    name: { $regex: /^CAN_DELETE_/ }
  });

  console.log(`✅ Deleted ${result.deletedCount} obsolete permissions\n`);
  console.log('💡 Restart server to sync ADMIN role permissions\n');

  process.exit(0);
});
