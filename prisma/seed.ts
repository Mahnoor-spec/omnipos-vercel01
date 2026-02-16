import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create a default tenant
    const tenant = await prisma.tenant.upsert({
        where: { id: 'default-tenant-id' },
        update: {},
        create: {
            id: 'default-tenant-id',
            name: 'OmniPOS Main Branch',
            appName: 'OmniPOS',
            primaryColor: '#38bdf8',
            secondaryColor: '#818cf8',
            themeMode: 'dark',
        },
    });

    console.log('Tenant created:', tenant.name);

    // Seed staff members
    const staff = [
        {
            fullName: 'System Admin',
            role: 'Admin',
            username: 'admin',
            password: 'admin123',
            email: 'admin@omnipos.com',
        },
        {
            fullName: 'Kitchen Staff',
            role: 'Kitchen',
            username: 'kitchen',
            password: 'kitchen123',
            email: 'kitchen@omnipos.com',
        },
        {
            fullName: 'Senior Waiter',
            role: 'Waiter',
            username: 'waiter',
            password: 'waiter123',
            email: 'waiter@omnipos.com',
        },
        {
            fullName: 'Main Till',
            role: 'Till',
            username: 'till',
            password: 'till123',
            email: 'till@omnipos.com',
        },
    ];

    for (const s of staff) {
        const passwordHash = await bcrypt.hash(s.password, 10);
        await prisma.staff.upsert({
            where: { username: s.username },
            update: {
                passwordHash,
                tenantId: tenant.id,
            },
            create: {
                fullName: s.fullName,
                role: s.role,
                username: s.username,
                passwordHash,
                email: s.email,
                tenantId: tenant.id,
            },
        });
    }

    console.log('Staff accounts seeded successfully.');

    // Seed Tables (1-10)
    for (let i = 1; i <= 10; i++) {
        const tableNum = `Table ${i}`;
        const existingTable = await prisma.restaurantTable.findFirst({
            where: {
                tenantId: tenant.id,
                tableNumber: tableNum
            }
        });

        if (!existingTable) {
            await prisma.restaurantTable.create({
                data: {
                    tenantId: tenant.id,
                    tableNumber: tableNum,
                    capacity: 4,
                    posX: i * 100,
                    posY: 100,
                    status: 'Available',
                }
            });
        }
    }
    console.log('Tables seeded.');

    // Seed Menu Categories
    const categories = [
        { name: 'Starters' },
        { name: 'Mains' },
        { name: 'Drinks' },
        { name: 'Desserts' }
    ];

    const categoryMap = new Map();

    for (const cat of categories) {
        let category = await prisma.category.findFirst({
            where: {
                tenantId: tenant.id,
                name: cat.name
            }
        });

        if (!category) {
            category = await prisma.category.create({
                data: {
                    tenantId: tenant.id,
                    name: cat.name,
                }
            });
        }
        categoryMap.set(cat.name, category.id);
    }
    console.log('Categories seeded.');

    // Seed Products
    const products = [
        { name: 'Garlic Bread', price: 4.50, category: 'Starters' },
        { name: 'Chicken Wings', price: 6.95, category: 'Starters' },
        { name: 'Cheeseburger', price: 12.50, category: 'Mains' },
        { name: 'Steak Frites', price: 18.00, category: 'Mains' },
        { name: 'Caesar Salad', price: 10.50, category: 'Mains' },
        { name: 'Coca Cola', price: 2.50, category: 'Drinks' },
        { name: 'Orange Juice', price: 3.00, category: 'Drinks' },
        { name: 'Chocolate Cake', price: 5.50, category: 'Desserts' }
    ];

    for (const p of products) {
        if (categoryMap.has(p.category)) {
            const catId = categoryMap.get(p.category);
            const existingProduct = await prisma.product.findFirst({
                where: {
                    tenantId: tenant.id,
                    categoryId: catId,
                    name: p.name
                }
            });

            if (!existingProduct) {
                await prisma.product.create({
                    data: {
                        tenantId: tenant.id,
                        categoryId: catId,
                        name: p.name,
                        price: p.price,
                    }
                });
            }
        }
    }
    console.log('Menu items seeded.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
