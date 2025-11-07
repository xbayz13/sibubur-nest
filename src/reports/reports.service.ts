import { Injectable } from '@nestjs/common';
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
  ) {}

  async getDailyReport(date: string, storeId?: number) {
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

    // Get transactions (revenue)
    const transactions = await this.transactionRepository.find({
      where: { ...where, status: TransactionStatus.PAID },
      relations: ['order', 'paymentMethod'],
    });

    const totalRevenue = transactions.reduce(
      (sum, txn) => sum + Number(txn.amount),
      0,
    );

    // Get orders
    const orders = await this.orderRepository.find({
      where,
      relations: ['orderItems', 'orderItems.product'],
    });

    const totalOrders = orders.length;
    const totalItems = orders.reduce(
      (sum, order) =>
        sum +
        order.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );

    // Get expenses
    const expenses = await this.expenseRepository.find({
      where,
      relations: ['category'],
    });

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + Number(exp.totalAmount),
      0,
    );

    // Get production
    const productionWhere: any = { date: date as any };
    if (storeId) {
      productionWhere.storeId = storeId;
    }
    const production = await this.productionRepository.findOne({
      where: productionWhere,
      relations: ['productionSupplies', 'productionSupplies.supply', 'weather'],
    });

    // Get weather
    const weather = await this.weatherRepository.findOne({
      where: { date: date as any },
    });

    // Get attendances
    const attendances = await this.attendanceRepository.find({
      where: { date: date as any },
      relations: ['employee'],
    });

    const presentCount = attendances.filter(
      (a) => a.status === 'present',
    ).length;
    const absentCount = attendances.filter(
      (a) => a.status === 'absent',
    ).length;

    // Get recommendations for next day
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    const recommendations = await this.getProductionRecommendations(
      nextDateStr,
      storeId,
      30,
    );

    return {
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
  }

  async getMonthlyReport(year: number, month: number, storeId?: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const where: any = {
      createdAt: Between(startDate, endDate),
    };
    if (storeId) {
      where.storeId = storeId;
    }

    // Get transactions
    const transactions = await this.transactionRepository.find({
      where: { ...where, status: TransactionStatus.PAID },
    });

    const totalRevenue = transactions.reduce(
      (sum, txn) => sum + Number(txn.amount),
      0,
    );

    // Get expenses
    const expenses = await this.expenseRepository.find({ where });

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + Number(exp.totalAmount),
      0,
    );

    // Get orders
    const orders = await this.orderRepository.find({ where });

    // Get productions
    const productions = await this.productionRepository.find({
      where: {
        date: Between(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]) as any,
        ...(storeId && { storeId }),
      },
    });

    return {
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
    };
  }

  async getYearlyReport(year: number, storeId?: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const where: any = {
      createdAt: Between(startDate, endDate),
    };
    if (storeId) {
      where.storeId = storeId;
    }

    // Get transactions
    const transactions = await this.transactionRepository.find({
      where: { ...where, status: TransactionStatus.PAID },
    });

    const totalRevenue = transactions.reduce(
      (sum, txn) => sum + Number(txn.amount),
      0,
    );

    // Get expenses
    const expenses = await this.expenseRepository.find({ where });

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + Number(exp.totalAmount),
      0,
    );

    // Get orders
    const orders = await this.orderRepository.find({ where });

    return {
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
    };
  }

  async getProductionRecommendations(
    targetDate: string,
    storeId?: number,
    lookbackDays: number = 30,
  ) {
    const target = new Date(targetDate);
    const targetDayOfWeek = target.getDay(); // 0 = Sunday, 6 = Saturday
    const startDate = new Date(target);
    startDate.setDate(startDate.getDate() - lookbackDays);

    const where: any = {};
    if (storeId) {
      where.storeId = storeId;
    }

    // Get historical productions
    const historicalProductions = await this.productionRepository.find({
      where: {
        date: Between(startDate.toISOString().split('T')[0], targetDate) as any,
        ...where,
      },
      relations: ['weather', 'store'],
    });

    // Get historical orders/transactions for the same period
    const historicalOrders = await this.orderRepository.find({
      where: {
        createdAt: Between(startDate, new Date(targetDate)),
        ...where,
      },
      relations: ['orderItems', 'orderItems.product'],
    });

    // Calculate average sales by day of week
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

    // Calculate average sales for target day of week
    const targetDaySales = salesByDayOfWeek[targetDayOfWeek] || [];
    const avgSalesForDayOfWeek =
      targetDaySales.length > 0
        ? targetDaySales.reduce((a, b) => a + b, 0) / targetDaySales.length
        : 0;

    // Get weather for target date (if available)
    const targetWeather = await this.weatherRepository.findOne({
      where: { date: targetDate as any },
    });

    // Calculate weather-based adjustments
    let weatherMultiplier = 1.0;
    if (targetWeather && targetWeather.weatherJson) {
      const targetCondition = targetWeather.weatherJson.condition;
      const sameWeatherProductions = historicalProductions.filter(
        (p) => p.weather?.weatherJson?.condition === targetCondition,
      );
      if (sameWeatherProductions.length > 0) {
        const avgProductionForWeather = sameWeatherProductions.reduce(
          (sum, p) => sum + (p.porridgeAmount || 0),
          0,
        ) / sameWeatherProductions.length;
        const overallAvgProduction =
          historicalProductions.reduce(
            (sum, p) => sum + (p.porridgeAmount || 0),
            0,
          ) / historicalProductions.length;
        if (overallAvgProduction > 0) {
          weatherMultiplier = avgProductionForWeather / overallAvgProduction;
        }
      }

      // Weather-specific adjustments
      switch (targetCondition) {
        case 'rainy':
        case 'stormy':
          weatherMultiplier *= 1.2; // More porridge needed in bad weather
          break;
        case 'sunny':
          weatherMultiplier *= 0.9; // Less porridge in sunny weather
          break;
        case 'cloudy':
          weatherMultiplier *= 1.0; // Normal
          break;
      }
    }

    // Calculate average production vs sales ratio
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
        : 1.5; // Default: produce 1.5x expected sales

    // Calculate recommended amount
    const baseRecommendation = avgSalesForDayOfWeek * avgRatio;
    const weatherAdjustedRecommendation = baseRecommendation * weatherMultiplier;

    // Add buffer (10% extra to account for variations)
    const recommendedAmount = Math.ceil(weatherAdjustedRecommendation * 1.1);

    // Generate recommendations text
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

    return {
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
  }
}

