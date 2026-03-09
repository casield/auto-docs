/**
 * Business logic layer for the Express application
 * Handles data operations and business rules
 */

interface User {
    id: number;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
}

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    description?: string;
}

interface Order {
    id: number;
    userId: number;
    items: OrderItem[];
    status: 'pending' | 'processing' | 'shipped' | 'delivered';
    total: number;
    createdAt: Date;
}

interface OrderItem {
    productId: number;
    quantity: number;
    price: number;
}

// In-memory store (use a real database in production)
const users: User[] = [
    { id: 1, email: 'alice@example.com', name: 'Alice Smith', role: 'admin', createdAt: new Date() },
    { id: 2, email: 'bob@example.com', name: 'Bob Johnson', role: 'user', createdAt: new Date() },
];

const products: Product[] = [
    { id: 1, name: 'Laptop', price: 999, category: 'Electronics', description: 'High-performance laptop' },
    { id: 2, name: 'Mouse', price: 29, category: 'Accessories' },
    { id: 3, name: 'Keyboard', price: 79, category: 'Accessories' },
];

const orders: Order[] = [];

/**
 * Retrieve a user by ID from the database
 */
export async function getUserById(userId: number): Promise<User> {
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    return user;
}

/**
 * Get all users with filtering and pagination
 */
export async function getAllUsers(options: {
    skip: number;
    limit: number;
    role?: string;
}): Promise<User[]> {
    let filtered = users;
    if (options.role) {
        filtered = filtered.filter(u => u.role === options.role);
    }
    return filtered.slice(options.skip, options.skip + options.limit);
}

/**
 * Create a new user record
 */
export async function createUserRecord(data: {
    email: string;
    name: string;
    role: string;
}): Promise<User> {
    if (users.some(u => u.email === data.email)) {
        throw new Error('Email already in use');
    }
    const newUser: User = {
        id: Math.max(...users.map(u => u.id), 0) + 1,
        ...data,
        createdAt: new Date(),
    };
    users.push(newUser);
    return newUser;
}

/**
 * Update an existing user record
 */
export async function updateUserRecord(userId: number, updates: Partial<User>): Promise<User> {
    const user = await getUserById(userId);
    Object.assign(user, updates);
    return user;
}

/**
 * Get a product by ID
 */
export async function getProductById(productId: number): Promise<Product> {
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');
    return product;
}

/**
 * List all products with pagination and category filtering
 */
export async function listAllProducts(options: {
    page: number;
    pageSize: number;
    category?: string;
}): Promise<Product[]> {
    let filtered = products;
    if (options.category) {
        filtered = filtered.filter(p => p.category === options.category);
    }
    const start = (options.page - 1) * options.pageSize;
    return filtered.slice(start, start + options.pageSize);
}

/**
 * Create a new product
 */
export async function createProductRecord(data: {
    name: string;
    price: number;
    category: string;
    description?: string;
}): Promise<Product> {
    const newProduct: Product = {
        id: Math.max(...products.map(p => p.id), 0) + 1,
        ...data,
    };
    products.push(newProduct);
    return newProduct;
}

/**
 * Get an order by ID
 */
export async function getOrderById(orderId: number): Promise<Order> {
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error('Order not found');
    return order;
}

/**
 * Get all orders with optional filtering
 */
export async function getAllOrders(options: {
    status?: string;
    sortBy: string;
}): Promise<Order[]> {
    let filtered = orders;
    if (options.status) {
        filtered = filtered.filter(o => o.status === options.status);
    }
    return filtered.sort((a, b) => {
        if (options.sortBy === 'createdAt') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
    });
}

/**
 * Create a new order
 */
export async function createOrderRecord(data: {
    items: OrderItem[];
    shippingAddress: string;
    paymentMethod: string;
}): Promise<Order> {
    const total = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const newOrder: Order = {
        id: Math.max(...orders.map(o => o.id), 0) + 1,
        userId: 1, // In production, get from authenticated user
        items: data.items,
        status: 'pending',
        total,
        createdAt: new Date(),
    };
    orders.push(newOrder);
    return newOrder;
}
