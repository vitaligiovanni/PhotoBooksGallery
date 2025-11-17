import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { orders, orderItems, currencies, users } from '../../../shared/schema';
import type { InsertOrder, InsertOrderItem } from '../../../shared/schema';
import { jwtAuth, mockAuth } from './middleware';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Получить заказы пользователя (требует JWT токен)
router.get('/', jwtAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Пользователь не авторизован' });
    }

    const userOrders = await db
      .select({
        id: orders.id,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
        shippingAddress: orders.shippingAddress,
        totalAmount: orders.totalAmount,
        status: orders.status,
        items: orders.items,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        currency: {
          code: currencies.code,
          symbol: currencies.symbol,
          name: currencies.name,
        }
      })
      .from(orders)
      .leftJoin(currencies, eq(orders.currencyId, currencies.id))
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    console.log(`[orders] GET /orders -> ${userOrders.length} orders for user ${userId}`);
    res.json(userOrders);
  } catch (error) {
    console.error('[orders] Error getting orders:', error);
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});

// Создать простой заказ для готовых товаров (без регистрации или с авторизацией)
router.post('/simple', async (req: any, res) => {
  try {
    // Проверяем есть ли залогиненный пользователь (может быть, может не быть)
    const userId = req.user?.claims?.sub || null;
    console.log('[orders] POST /simple received data:', req.body, 'userId:', userId);

    const { 
      cartItems, 
      customerName,
      customerPhone,
      shippingAddress, 
      paymentMethod,
      notes,
      currencyId,
      totalAmount
    }: {
      cartItems: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
        imageUrl?: string;
      }>;
      customerName: string;
      customerPhone: string;
      shippingAddress: string;
      paymentMethod: string;
      notes?: string;
      currencyId: string;
      totalAmount: number;
    } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    if (!customerName || !customerPhone || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    // Получить валюту
    let currency = await db
      .select()
      .from(currencies)
      .where(eq(currencies.id, currencyId))
      .limit(1);

    if (!currency.length) {
      return res.status(404).json({ error: 'Валюта не найдена' });
    }

    // Создать заказ с привязкой к пользователю ЕСЛИ он залогинен
    const newOrder: InsertOrder = {
      userId: userId, // Если есть userId - привязываем заказ, если нет - null (гостевой заказ)
      customerName: customerName,
      customerEmail: '', // Не требуется для простых заказов
      customerPhone: customerPhone,
      shippingAddress: shippingAddress,
      totalAmount: totalAmount.toString(),
      currencyId: currencyId,
      exchangeRate: '1.0',
      status: 'pending',
      items: cartItems, // Сохраняем как JSON
    };
    
    console.log('[orders] Simple order data to insert:', newOrder);

    const [createdOrder] = await db
      .insert(orders)
      .values(newOrder)
      .returning();

    // Создать элементы заказа
    const orderItemsData: InsertOrderItem[] = cartItems.map(item => ({
      orderId: createdOrder.id,
      productId: item.id, // ID готового товара
      productName: item.name,
      productImageUrl: item.imageUrl || null,
      quantity: item.quantity,
      unitPrice: item.price.toString(),
      totalPrice: (item.price * item.quantity).toString(),
      options: { paymentMethod, notes: notes || null },
    }));

    await db
      .insert(orderItems)
      .values(orderItemsData);

    console.log(`[orders] POST /simple -> created order ${createdOrder.id} for ${customerName}, total: ${totalAmount}`);
    
    res.status(201).json({
      message: 'Заказ успешно создан',
      order: {
        ...createdOrder,
        currency: currency[0]
      }
    });
  } catch (error) {
    console.error('[orders] Error creating simple order:', error);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  }
});

// Создать заказ из личного кабинета (через сессию/куки)
router.post('/profile', mockAuth, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Пользователь не авторизован' });
    }

    console.log('[orders] POST /orders/profile - userId from session:', userId);

    const { 
      cartItems, 
      shippingAddress, 
      phone,
      customerPhone, 
      currencyId,
      paymentMethod
    } = req.body;
    
    const phoneNumber = phone || customerPhone;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Адрес доставки обязателен' });
    }

    // Получить данные пользователя
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Вычисляем общую сумму
    const totalAmount = cartItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    // Создаем заказ
    const newOrder = {
      id: uuidv4(),
      userId: userId,
      customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      customerEmail: user.email,
      customerPhone: phoneNumber || '',
      shippingAddress,
      totalAmount,
      currencyId,
      paymentMethod: paymentMethod || 'cash_on_delivery',
      status: 'pending' as const,
      items: cartItems,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(orders).values(newOrder);

    return res.status(201).json({ 
      message: 'Заказ успешно создан',
      order: newOrder
    });

  } catch (error) {
    console.error('Error creating order from profile:', error);
    return res.status(500).json({ error: 'Ошибка создания заказа' });
  }
});

// Создать заказ из корзины (требует JWT токен)
router.post('/', jwtAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Пользователь не авторизован' });
    }

    console.log('[orders] POST /orders received data:', req.body); // Добавим логирование

    const { 
      cartItems, 
      shippingAddress, 
      phone,
      customerPhone, 
      currencyId,
      paymentMethod
    }: {
      cartItems: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
        imageUrl?: string;
        options?: Record<string, any>;
      }>;
      shippingAddress: string;
      phone?: string;
      customerPhone?: string;
      currencyId: string;
      paymentMethod?: string;
    } = req.body;
    
    // Поддерживаем оба варианта названия поля
    const phoneNumber = phone || customerPhone;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Адрес доставки обязателен' });
    }

    // Получить данные пользователя
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      console.log('[orders] User not found:', userId);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    console.log('[orders] Found user:', { id: user[0].id, email: user[0].email });

    // Получить курс валюты
    let currency = await db
      .select()
      .from(currencies)
      .where(eq(currencies.id, currencyId))
      .limit(1);

    if (!currency.length) {
      console.log('[orders] Currency not found, creating default currencies...');
      
      // Создать валюты по умолчанию если их нет
      try {
        await db.insert(currencies).values([
          {
            id: 'amd',
            code: 'AMD',
            name: { ru: 'Армянский драм', hy: 'Հայկական դրամ', en: 'Armenian Dram' },
            symbol: '֏',
            isBaseCurrency: true,
            isActive: true,
            sortOrder: 1,
          },
          {
            id: 'usd',
            code: 'USD', 
            name: { ru: 'Доллар США', hy: 'ԱՄՆ դոլար', en: 'US Dollar' },
            symbol: '$',
            isBaseCurrency: false,
            isActive: true,
            sortOrder: 2,
          },
          {
            id: 'rub',
            code: 'RUB',
            name: { ru: 'Российский рубль', hy: 'Ռուսական ռուբլի', en: 'Russian Ruble' },
            symbol: '₽',
            isBaseCurrency: false,
            isActive: true,
            sortOrder: 3,
          }
        ] as any).onConflictDoNothing();
        
        // Попробовать найти валюту еще раз
        currency = await db
          .select()
          .from(currencies)
          .where(eq(currencies.id, currencyId))
          .limit(1);
      } catch (currencyError) {
        console.error('[orders] Error creating currencies:', currencyError);
      }
      
      if (!currency.length) {
        return res.status(404).json({ error: 'Валюта не найдена и не может быть создана' });
      }
    }

    // Подсчитать общую стоимость
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Создать заказ
    const newOrder: InsertOrder = {
      userId: userId,
      customerName: `${user[0].firstName || ''} ${user[0].lastName || ''}`.trim() || user[0].email || 'Клиент',
      customerEmail: user[0].email || '',
      customerPhone: phoneNumber || '',
      shippingAddress: shippingAddress,
      totalAmount: totalAmount.toString(),
      currencyId: currencyId,
      exchangeRate: '1.0', // TODO: получить актуальный курс
      status: 'pending',
      items: cartItems, // Сохраняем как JSON
    };
    
    console.log('[orders] Order data to insert:', newOrder);

    const [createdOrder] = await db
      .insert(orders)
      .values(newOrder)
      .returning();

    // Создать элементы заказа
    const orderItemsData: InsertOrderItem[] = cartItems.map(item => ({
      orderId: createdOrder.id,
      productId: null, // У нас нет привязки к продукту для калькулятора
      productName: item.name,
      productImageUrl: item.imageUrl || null,
      quantity: item.quantity,
      unitPrice: item.price.toString(),
      totalPrice: (item.price * item.quantity).toString(),
      options: item.options || null,
    }));

    await db
      .insert(orderItems)
      .values(orderItemsData);

    console.log(`[orders] POST /orders -> created order ${createdOrder.id} for user ${userId}, total: ${totalAmount}`);
    
    res.status(201).json({
      message: 'Заказ успешно создан',
      order: {
        ...createdOrder,
        currency: currency[0]
      }
    });
  } catch (error) {
    console.error('[orders] Error creating order:', error);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  }
});

// Получить детали заказ
router.get('/:id', mockAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    const orderId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Пользователь не авторизован' });
    }

    const order = await db
      .select({
        id: orders.id,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
        shippingAddress: orders.shippingAddress,
        totalAmount: orders.totalAmount,
        status: orders.status,
        items: orders.items,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        currency: {
          id: currencies.id,
          code: currencies.code,
          symbol: currencies.symbol,
          name: currencies.name,
        }
      })
      .from(orders)
      .leftJoin(currencies, eq(orders.currencyId, currencies.id))
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order.length) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    // Проверить что заказ принадлежит пользователю
    const orderOwner = await db
      .select({ userId: orders.userId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!orderOwner.length || orderOwner[0].userId !== userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Получить детальные элементы заказа
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    console.log(`[orders] GET /orders/${orderId} -> order details`);
    res.json({
      ...order[0],
      detailedItems: items
    });
  } catch (error) {
    console.error('[orders] Error getting order details:', error);
    res.status(500).json({ error: 'Ошибка получения деталей заказа' });
  }
});

export { router as ordersRouter };