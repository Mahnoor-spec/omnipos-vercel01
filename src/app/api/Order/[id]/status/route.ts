import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await verifyAuth(request);
    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { newStatus } = await request.json();

        const order = await prisma.order.update({
            where: { id },
            data: {
                status: newStatus,
                workflowStatus: newStatus,
            },
        });

        // In a real app, we would also create a notification here
        // similar to the C# controller.

        return NextResponse.json({ status: 'Updated', workflowStatus: order.workflowStatus });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
