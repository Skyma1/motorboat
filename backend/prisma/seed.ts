import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminPass = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { phone: '+79000000000' },
    update: {},
    create: {
      name: 'Администратор',
      phone: '+79000000000',
      passwordHash: adminPass,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin: ${admin.name} (phone: +79000000000, pass: admin123)`);

  const dispatcherPass = await bcrypt.hash('disp123', 12);
  const dispatcher = await prisma.user.upsert({
    where: { phone: '+79000000001' },
    update: {},
    create: {
      name: 'Анна Диспетчер',
      phone: '+79000000001',
      passwordHash: dispatcherPass,
      role: 'DISPATCHER',
      dispatcherRate: { create: { ratePerTrip: 1000 } },
    },
  });
  console.log(`✅ Dispatcher: ${dispatcher.name} (phone: +79000000001, pass: disp123)`);

  const captainPass = await bcrypt.hash('capt123', 12);
  const captain = await prisma.user.upsert({
    where: { phone: '+79000000002' },
    update: {},
    create: {
      name: 'Иван Капитан',
      phone: '+79000000002',
      passwordHash: captainPass,
      role: 'CAPTAIN',
      captainRate: { create: { hourlyRate: 1400, exitPayment: 3000 } },
    },
  });
  console.log(`✅ Captain: ${captain.name} (phone: +79000000002, pass: capt123)`);

  const boat = await prisma.boat.upsert({
    where: { id: 'boat_aurora' },
    update: {},
    create: {
      id: 'boat_aurora',
      name: 'Аврора',
      captain: { create: { captainId: captain.id } },
    },
  });
  console.log(`✅ Boat: ${boat.name}`);

  const pier1 = await prisma.pier.upsert({
    where: { id: 'pier_naberezhnaya' },
    update: {},
    create: { id: 'pier_naberezhnaya', name: 'Набережная', cost: 600 },
  });
  const pier2 = await prisma.pier.upsert({
    where: { id: 'pier_park' },
    update: {},
    create: { id: 'pier_park', name: 'Парк', cost: 500 },
  });
  console.log(`✅ Piers: ${pier1.name}, ${pier2.name}`);

  console.log('✅ Database seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
