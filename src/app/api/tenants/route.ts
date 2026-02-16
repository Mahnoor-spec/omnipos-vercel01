import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: Request) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        // For now, return all tenants so the user can switch context if needed
        // In a real multi-tenant app, we might restrict this based on user role
        const tenants = await prisma.tenant.findMany({
            select: {
                id: true,
                name: true,
                appName: true,
            }
        });
        return NextResponse.json(tenants);
    } catch (error) {
        console.error('Failed to fetch tenants:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
