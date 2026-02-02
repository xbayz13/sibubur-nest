import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from '../entities/order.entity';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { Production } from '../entities/production.entity';
import { Expense } from '../entities/expense.entity';
import { Attendance } from '../entities/attendance.entity';
import { Weather } from '../entities/weather.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Production)
    private productionRepository: Repository<Production>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Weather)
    private weatherRepository: Repository<Weather>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * Returns daily report: revenue, orders, expenses, production, weather, attendance, recommendations.
   * Cached by date and storeId.
   */
  async getDailyReport(date: string, storeId?: number) {
    const cacheKey = `report:daily:${date}:${storeId ?? 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as Awaited<ReturnType<ReportsService['getDailyReport']>>;

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const where: any = {
      createdAt: Between(startDate, endDate),
    };
    if (storeId) {
      where.storeId = storeId;
    }

    const productionWhere: any = { date: date as any };
    if (storeId) {
      productionWhere.storeId = storeId;
    }

    const [transactions, orders, expenses, production, weather, attendances] =
      await Promise.all([
        this.transactionRepository.find({
          where: { ...where, status: TransactionStatus.PAID },
          relations: ['order', 'paymentMethod'],
        }),
        this.orderRepository.find({
          where,
          relations: ['orderItems', 'orderItems.product'],
        }),
        this.expenseRepository.find({
          where,
          relations: ['category'],
        }),
        this.productionRepository.findOne({
          where: productionWhere,
          relations: ['productionSupplies', 'productionSupplies.supply', 'weather'],
        }),
        this.weatherRepository.findOne({
          where: { date: date as any },
        }),
        this.attendanceRepository.find({
          where: { date: date as any },
          relations: ['employee'],
        }),
      ]);

    const totalRevenue = transactions.reduce(
      (sum, txn) => sum + Number(txn.amount),
      0,
    );
    const totalOrders = orders.length;
    const totalItems = orders.reduce(
      (sum, order) =>
        sum +
        order.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + Number(exp.totalAmount),
      0,
    );
    const presentCount = attendances.filter((a) => a.status === 'present').length;
    const absentCount = attendances.filter((a) => a.status === 'absent').length;

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    const recommendations = await this.getProductionRecommendations(
      nextDateStr,
      storeId,
      30,
    );

    const result = {
      date,
      revenue: {
        total: totalRevenue,
        transactions: transactions.length,
        transactionsDetail: transactions,
      },
      orders: {
        total: totalOrders,
        items: totalItems,
        ordersDetail: orders,
      },
      expenses: {
        total: totalExpenses,
        expensesDetail: expenses,
      },
      production,
      weather,
      attendance: {
        present: presentCount,
        absent: absentCount,
        total: attendances.length,
        attendancesDetail: attendances,
      },
      netProfit: totalRevenue - totalExpenses,
      recommendations,
    };
    await this.cacheManager.set(cacheKey, result);
    return result;
  }

  /**
   * Returns monthly report: revenue, expenses, orders, productions, aggregates.
   * Cached by year, month, storeId.
   */
  async getMonthlyReport(year: number, month: number, storeId?: number) {
    const cacheKey = `report:monthly:${year}:${month}:${storeId ?? 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as Awaited<ReturnType<ReportsService['getMonthlyReport']>>;

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const where: any = {
      createdAt: Between(startDate, endDate),
    };
    if (storeId) {
      where.storeId = storeId;
    }

    const [transactions, expenses, orders] = await Promise.all([
      this.transactionRepository.find({
        where: { ...where, status: TransactionStatus.PAID },
      }),
      this.expenseRepository.find({ where }),
      this.orderRepository.find({ where }),
    ]);

    const totalRevenue = transactions.reduce(
      (sum, txn) => sum + Number(txn.amount),
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + Number(exp.totalAmount),
      0,
    );

    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
    
    const productions = await this.productionRepository.find({
      where: {
        date: Between(startDateStr, endDateStr) as any,
        ...(storeId && { storeId }),
      },
    });

    const dailyRevenueMap = new Map<string, number>();
    const dailyExpensesMap = new Map<string, number>();
    const daysWithActivitySet = new Set<string>();

    transactions.forEach((txn) => {
      const txnDate = new Date(txn.createdAt);
      const day = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}-${String(txnDate.getDate()).padStart(2, '0')}`;
      const current = dailyRevenueMap.get(day) || 0;
      dailyRevenueMap.set(day, current + Number(txn.amount));
      daysWithActivitySet.add(day);
    });

    expenses.forEach((exp) => {
      const expDate = new Date(exp.createdAt);
      const day = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}-${String(expDate.getDate()).padStart(2, '0')}`;
      const current = dailyExpensesMap.get(day) || 0;
      dailyExpensesMap.set(day, current + Number(exp.totalAmount));
      daysWithActivitySet.add(day);
    });

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const day = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
      daysWithActivitySet.add(day);
    });

    productions.forEach((production) => {
      if (production.date) {
        // Ensure production date is within the month range
        const dateStr = typeof production.date === 'string' ? production.date : production.date.toString();
        const prodDate = new Date(dateStr);
        if (prodDate.getFullYear() === year && prodDate.getMonth() + 1 === month) {
          daysWithActivitySet.add(dateStr);
        }
      }
    });

    const daysWithData = daysWithActivitySet.size;

    const daysInMonth = new Date(year, month, 0).getDate();
    const averageDailyRevenue = daysWithData > 0 
      ? totalRevenue / daysWithData 
      : (daysInMonth > 0 && totalRevenue > 0 ? totalRevenue / daysInMonth : 0);
    const averageDailyExpenses = daysWithData > 0 
      ? totalExpenses / daysWithData 
      : (daysInMonth > 0 && totalExpenses > 0 ? totalExpenses / daysInMonth : 0);

    const result = {
      year,
      month,
      revenue: {
        total: totalRevenue,
        transactions: transactions.length,
      },
      expenses: {
        total: totalExpenses,
        count: expenses.length,
      },
      orders: {
        total: orders.length,
      },
      productions: {
        total: productions.length,
      },
      netProfit: totalRevenue - totalExpenses,
      averageDailyRevenue,
      averageDailyExpenses,
      daysWithData,
    };
    await this.cacheManager.set(cacheKey, result);
    return result;
  }

  /**
   * Returns yearly report: revenue, expenses, orders, monthly aggregates.
   * Cached by year, storeId.
   */
  async getYearlyReport(year: number, storeId?: number) {
    const cacheKey = `report:yearly:${year}:${storeId ?? 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as Awaited<ReturnType<ReportsService['getYearlyReport']>>;

    const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const where: any = {
      createdAt: Between(startDate, endDate),
    };
    if (storeId) {
      where.storeId = storeId;
    }

    const [transactions, expenses, orders] = await Promise.all([
      this.transactionRepository.find({
        where: { ...where, status: TransactionStatus.PAID },
      }),
      this.expenseRepository.find({ where }),
      this.orderRepository.find({ where }),
    ]);

    const totalRevenue = transactions.reduce(
      (sum, txn) => sum + Number(txn.amount),
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + Number(exp.totalAmount),
      0,
    );

    const monthlyRevenueMap = new Map<number, number>();
    const monthlyExpensesMap = new Map<number, number>();
    const monthsWithActivitySet = new Set<number>();

    transactions.forEach((txn) => {
      const txnDate = new Date(txn.createdAt);
      const month = txnDate.getMonth();
      const current = monthlyRevenueMap.get(month) || 0;
      monthlyRevenueMap.set(month, current + Number(txn.amount));
      monthsWithActivitySet.add(month);
    });

    expenses.forEach((exp) => {
      const expDate = new Date(exp.createdAt);
      const month = expDate.getMonth();
      const current = monthlyExpensesMap.get(month) || 0;
      monthlyExpensesMap.set(month, current + Number(exp.totalAmount));
      monthsWithActivitySet.add(month);
    });

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const month = orderDate.getMonth();
      monthsWithActivitySet.add(month);
    });

    const monthsWithData = monthsWithActivitySet.size;

    const averageMonthlyRevenue = monthsWithData > 0 
      ? totalRevenue / monthsWithData 
      : (totalRevenue > 0 ? totalRevenue / 12 : 0);
    const averageMonthlyExpenses = monthsWithData > 0 
      ? totalExpenses / monthsWithData 
      : (totalExpenses > 0 ? totalExpenses / 12 : 0);

    const result = {
      year,
      revenue: {
        total: totalRevenue,
        transactions: transactions.length,
      },
      expenses: {
        total: totalExpenses,
        count: expenses.length,
      },
      orders: {
        total: orders.length,
      },
      netProfit: totalRevenue - totalExpenses,
      averageMonthlyRevenue,
      averageMonthlyExpenses,
      monthsWithData,
    };
    await this.cacheManager.set(cacheKey, result);
    return result;
  }

  /**
   * Returns production recommendation for target date using historical sales and weather.
   * Cached by date, storeId, lookbackDays.
   */
  async getProductionRecommendations(
    targetDate: string,
    storeId?: number,
    lookbackDays: number = 30,
  ) {
    const cacheKey = `report:recommendations:${targetDate}:${storeId ?? 'all'}:${lookbackDays}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as Awaited<ReturnType<ReportsService['getProductionRecommendations']>>;

    const target = new Date(targetDate);
    const targetDayOfWeek = target.getDay();
    const startDate = new Date(target);
    startDate.setDate(startDate.getDate() - lookbackDays);

    const where: any = {};
    if (storeId) {
      where.storeId = storeId;
    }

    const [historicalProductions, historicalOrders, targetWeather] = await Promise.all([
      this.productionRepository.find({
        where: {
          date: Between(startDate.toISOString().split('T')[0], targetDate) as any,
          ...where,
        },
        relations: ['weather'],
      }),
      this.orderRepository.find({
        where: {
          createdAt: Between(startDate, new Date(targetDate)),
          ...where,
        },
        relations: ['orderItems'],
      }),
      this.weatherRepository.findOne({
        where: { date: targetDate as any },
      }),
    ]);

    const salesByDayOfWeek: { [key: number]: number[] } = {};
    historicalOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const dayOfWeek = orderDate.getDay();
      const totalItems = order.orderItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      if (!salesByDayOfWeek[dayOfWeek]) {
        salesByDayOfWeek[dayOfWeek] = [];
      }
      salesByDayOfWeek[dayOfWeek].push(totalItems);
    });

    const targetDaySales = salesByDayOfWeek[targetDayOfWeek] || [];
    const avgSalesForDayOfWeek =
      targetDaySales.length > 0
        ? targetDaySales.reduce((a, b) => a + b, 0) / targetDaySales.length
        : 0;

    const isSimilarWeather = (condition1: string, condition2: string): boolean => {
      if (!condition1 || !condition2) return false;
      const c1 = condition1.toLowerCase();
      const c2 = condition2.toLowerCase();
      if (c1 === c2) return true;
      const sunnyGroup = ['sunny', 'cerah', 'cerah berawan'];
      const cloudyGroup = ['cloudy', 'berawan', 'cerah berawan'];
      const rainyGroup = ['rainy', 'hujan', 'hujan ringan', 'hujan sedang', 'hujan lebat'];
      const stormyGroup = ['stormy', 'badai', 'hujan lebat', 'hujan deras'];
      
      const groups = [sunnyGroup, cloudyGroup, rainyGroup, stormyGroup];
      
      for (const group of groups) {
        if (group.includes(c1) && group.includes(c2)) {
          return true;
        }
      }
      
      return false;
    };

    let weatherMultiplier = 1.0;
    if (targetWeather && targetWeather.weatherJson) {
      const targetCondition = targetWeather.weatherJson.condition;
      
      const similarWeatherProductions = historicalProductions.filter(
        (p) => {
          const prodCondition = p.weather?.weatherJson?.condition;
          return prodCondition && isSimilarWeather(targetCondition, prodCondition);
        },
      );
      
      if (similarWeatherProductions.length > 0) {
        const avgProductionForWeather = similarWeatherProductions.reduce(
          (sum, p) => sum + (p.porridgeAmount || 0),
          0,
        ) / similarWeatherProductions.length;
        const overallAvgProduction =
          historicalProductions.reduce(
            (sum, p) => sum + (p.porridgeAmount || 0),
            0,
          ) / historicalProductions.length;
        if (overallAvgProduction > 0) {
          weatherMultiplier = avgProductionForWeather / overallAvgProduction;
        }
      }

      const targetConditionLower = targetCondition.toLowerCase();
      if (targetConditionLower.includes('rain') || targetConditionLower.includes('hujan') || 
          targetConditionLower.includes('storm') || targetConditionLower.includes('badai')) {
        weatherMultiplier *= 1.2; // More porridge needed in bad weather
      } else if (targetConditionLower.includes('sunny') || targetConditionLower.includes('cerah')) {
        weatherMultiplier *= 0.9; // Less porridge in sunny weather
      } else {
        weatherMultiplier *= 1.0; // Normal for cloudy/other
      }
    }

    const productionSalesRatios: number[] = [];
    historicalProductions.forEach((prod) => {
      if (prod.porridgeAmount && prod.porridgeAmount > 0) {
        const prodDate = new Date(prod.date);
        prodDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(prodDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayOrders = historicalOrders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= prodDate && orderDate < nextDate;
        });

        const daySales = dayOrders.reduce(
          (sum, order) =>
            sum +
            order.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0),
          0,
        );

        if (daySales > 0) {
          productionSalesRatios.push(prod.porridgeAmount / daySales);
        }
      }
    });

    const avgRatio =
      productionSalesRatios.length > 0
        ? productionSalesRatios.reduce((a, b) => a + b, 0) /
          productionSalesRatios.length
        : 1.5;

    const baseRecommendation = avgSalesForDayOfWeek * avgRatio;
    const weatherAdjustedRecommendation = baseRecommendation * weatherMultiplier;

    const recommendedAmount = Math.ceil(weatherAdjustedRecommendation * 1.1);

    const recommendations: string[] = [];

    if (avgSalesForDayOfWeek > 0) {
      recommendations.push(
        `Berdasarkan data ${lookbackDays} hari terakhir, rata-rata penjualan untuk hari ini adalah ${avgSalesForDayOfWeek.toFixed(1)} porsi.`,
      );
    } else {
      recommendations.push(
        'Tidak ada data historis yang cukup. Gunakan estimasi berdasarkan produksi sebelumnya.',
      );
    }

    if (targetWeather && targetWeather.weatherJson) {
      const condition = targetWeather.weatherJson.condition || '';
      const description = targetWeather.weatherJson.description || '';
      recommendations.push(
        `Cuaca hari ini: ${condition}. ${description}`,
      );
      if (weatherMultiplier > 1.1) {
        recommendations.push(
          'Cuaca hari ini cenderung meningkatkan permintaan. Pertimbangkan untuk memproduksi lebih banyak.',
        );
      } else if (weatherMultiplier < 0.9) {
        recommendations.push(
          'Cuaca hari ini cenderung menurunkan permintaan. Pertimbangkan untuk memproduksi sedikit lebih sedikit.',
        );
      }
    }

    if (productionSalesRatios.length > 0) {
      const avgWasteRatio = avgRatio - 1;
      if (avgWasteRatio > 0.3) {
        recommendations.push(
          `Rasio produksi vs penjualan menunjukkan waste sekitar ${(avgWasteRatio * 100).toFixed(0)}%. Pertimbangkan untuk mengurangi produksi.`,
        );
      } else if (avgWasteRatio < 0.1) {
        recommendations.push(
          'Rasio produksi vs penjualan menunjukkan produksi hampir habis. Pertimbangkan untuk menambah produksi untuk menghindari kehabisan stok.',
        );
      }
    }

    recommendations.push(
      `Rekomendasi jumlah produksi: ${recommendedAmount} porsi.`,
    );

    const result = {
      recommendedAmount,
      baseRecommendation: Math.ceil(baseRecommendation),
      weatherMultiplier,
      avgSalesForDayOfWeek: avgSalesForDayOfWeek.toFixed(1),
      targetDayOfWeek,
      targetWeather,
      recommendations,
      historicalData: {
        productionCount: historicalProductions.length,
        orderCount: historicalOrders.length,
        lookbackDays,
      },
    };
    await this.cacheManager.set(cacheKey, result);
    return result;
  }
}

