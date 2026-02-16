import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Category {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    price: number;
    categoryId: string;
}

interface Order {
    id: string;
    customerName: string;
    tableId: string;
    amount: string;
    status: string;
    syncStatus: string;
    items: any[];
    clock: Record<string, number>;
    createdAt: string;
    [key: string]: any;
}

interface User {
    id: string;
    fullName: string;
    role: string;
    tenantId: string;
}

interface StoreState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    currentTenantId: string | null;
    currentView: string;
    orders: Order[];
    categories: Category[];
    menuItems: Product[];
    tables: any[];
    notifications: any[];
    tenants: any[];
    logs: string[];
    branding: any;
    deviceId: string;

    // Actions
    login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    setView: (view: string) => void;
    setTenant: (id: string) => void;
    addLog: (msg: string) => void;
    fetchOrders: () => Promise<void>;
    fetchMenu: () => Promise<void>;
    fetchTables: () => Promise<void>;
    fetchNotifications: () => Promise<void>;
    fetchTenants: () => Promise<void>;
    createOrder: (order: any) => Promise<void>;
    updateOrderStatus: (id: string, status: string) => Promise<void>;
    syncOrders: () => Promise<void>;
    initSignalR: () => Promise<void>;
}

export const useStore = create<StoreState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            currentTenantId: 'default-tenant-id',
            currentView: 'Dashboard',
            orders: [],
            categories: [],
            menuItems: [],
            tables: [],
            notifications: [],
            tenants: [],
            logs: ['> OmniPOS - System ready...'],
            deviceId: `tablet-${Math.floor(Math.random() * 1000)}`,
            branding: {
                appName: 'OmniPOS',
                primaryColor: '#38bdf8',
                secondaryColor: '#818cf8',
                themeMode: 'dark',
            },

            login: async (username, password) => {
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        set({
                            user: data.user,
                            token: data.token,
                            isAuthenticated: true,
                            currentTenantId: data.user.tenantId,
                        });
                        get().addLog(`User ${data.user.fullName} logged in.`);
                        // Fetch initial data
                        get().fetchTenants();
                        return { success: true };
                    } else {
                        const err = await response.json();
                        return { success: false, message: err.message || 'Authentication failed' };
                    }
                } catch (error) {
                    return { success: false, message: 'Server connection error' };
                }
            },

            logout: () => {
                set({ user: null, token: null, isAuthenticated: false });
                get().addLog('User logged out.');
            },

            setView: (view) => set({ currentView: view }),
            setTenant: (id) => set({ currentTenantId: id }),

            addLog: (msg) => set((state) => ({
                logs: [...state.logs.slice(-50), `> ${msg}`]
            })),

            fetchOrders: async () => {
                const { token, currentTenantId } = get();
                if (!token) return;
                try {
                    const response = await fetch('/api/Order', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'X-Tenant-ID': currentTenantId || ''
                        },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        set({ orders: data });
                    }
                } catch (error) {
                    console.error('Fetch orders failed', error);
                }
            },

            fetchMenu: async () => {
                const { token } = get();
                if (!token) return;
                try {
                    const [catRes, itemRes] = await Promise.all([
                        fetch('/api/Menu/categories', { headers: { 'Authorization': `Bearer ${token}` } }),
                        fetch('/api/Menu/items', { headers: { 'Authorization': `Bearer ${token}` } }),
                    ]);
                    if (catRes.ok && itemRes.ok) {
                        set({
                            categories: await catRes.json(),
                            menuItems: await itemRes.json(),
                        });
                    }
                } catch (error) {
                    console.error('Fetch menu failed', error);
                }
            },

            fetchTables: async () => {
                const { token, currentTenantId } = get();
                if (!token) return;
                try {
                    const response = await fetch('/api/table', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'X-Tenant-ID': currentTenantId || ''
                        },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        set({ tables: data });
                    }
                } catch (error) {
                    console.error('Fetch tables failed', error);
                }
            },

            fetchNotifications: async () => {
                const { token, currentTenantId } = get();
                if (!token) return;
                try {
                    const response = await fetch('/api/notification', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'X-Tenant-ID': currentTenantId || ''
                        },
                    });
                    if (response.ok) {
                        set({ notifications: await response.json() });
                    }
                } catch (error) {
                    console.error('Fetch notifications failed', error);
                }
            },

            fetchTenants: async () => {
                const { token } = get();
                if (!token) return;
                try {
                    const response = await fetch('/api/tenants', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        set({ tenants: await response.json() });
                    }
                } catch (error) {
                    console.error('Fetch tenants failed', error);
                }
            },

            createOrder: async (orderData) => {
                const { token, currentTenantId, deviceId } = get();
                if (!token) return;

                const id = crypto.randomUUID();
                const clock = { [deviceId]: 1 };

                const newOrder: Order = {
                    id,
                    tenantId: currentTenantId,
                    ...orderData,
                    status: 'Placed',
                    syncStatus: 'Offline',
                    clock,
                    createdAt: new Date().toISOString()
                };

                set((state) => ({
                    orders: [newOrder, ...state.orders]
                }));

                get().addLog(`Order ${id.slice(0, 8)} created locally.`);
                get().syncOrders();
            },

            updateOrderStatus: async (id, status) => {
                const { token } = get();
                if (!token) return;
                try {
                    const response = await fetch(`/api/Order/${id}/status`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({ newStatus: status }),
                    });
                    if (response.ok) {
                        get().fetchOrders();
                    }
                } catch (error) {
                    console.error('Update status failed', error);
                }
            },

            syncOrders: async () => {
                const { orders, token, currentTenantId, addLog } = get();
                if (!token) return;

                const unsynced = orders.filter(o => o.syncStatus === 'Offline');
                if (unsynced.length === 0) return;

                addLog(`Syncing ${unsynced.length} orders...`);

                try {
                    const response = await fetch('/api/OfflineSync/sync-orders', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'X-Tenant-ID': currentTenantId || ''
                        },
                        body: JSON.stringify(unsynced),
                    });

                    if (response.ok) {
                        const results = await response.json();
                        set((state) => ({
                            orders: state.orders.map(o => {
                                const res = results.find((r: any) => r.id === o.id);
                                if (res) return { ...o, syncStatus: 'Synchronized' };
                                return o;
                            })
                        }));
                        addLog("Sync complete.");
                    }
                } catch (error) {
                    addLog("Sync failed.");
                }
            },

            initSignalR: async () => {
                // Placeholder for future Pusher/Supabase real-time integration
                console.log('[Realtime] Initializing connection...');
            }
        }),
        {
            name: 'omnipos-storage-v2',
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
