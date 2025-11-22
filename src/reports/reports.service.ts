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
    // Create date range - use local time for start, end of month for end
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
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

    // Get productions - use date string comparison
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
    
    const productions = await this.productionRepository.find({
      where: {
        date: Between(startDateStr, endDateStr) as any,
        ...(storeId && { storeId }),
      },
    });

    // Calculate daily statistics
    const dailyRevenueMap = new Map<string, number>();
    const dailyExpensesMap = new Map<string, number>();
    const daysWithActivitySet = new Set<string>();

    // Group transactions by day
    transactions.forEach((txn) => {
      const txnDate = new Date(txn.createdAt);
      const day = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}-${String(txnDate.getDate()).padStart(2, '0')}`;
      const current = dailyRevenueMap.get(day) || 0;
      dailyRevenueMap.set(day, current + Number(txn.amount));
      daysWithActivitySet.add(day);
    });

    // Group expenses by day
    expenses.forEach((exp) => {
      const expDate = new Date(exp.createdAt);
      const day = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}-${String(expDate.getDate()).padStart(2, '0')}`;
      const current = dailyExpensesMap.get(day) || 0;
      dailyExpensesMap.set(day, current + Number(exp.totalAmount));
      daysWithActivitySet.add(day);
    });

    // Group orders by day
    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const day = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
      daysWithActivitySet.add(day);
    });

    // Group productions by day (production.date is a string in YYYY-MM-DD format)
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

    // Calculate days with data (days that have ANY activity)
    const daysWithData = daysWithActivitySet.size;

    // Calculate averages - divide by days with data, or by total days in month if no data
    const daysInMonth = new Date(year, month, 0).getDate();
    const averageDailyRevenue = daysWithData > 0 
      ? totalRevenue / daysWithData 
      : (daysInMonth > 0 && totalRevenue > 0 ? totalRevenue / daysInMonth : 0);
    const averageDailyExpenses = daysWithData > 0 
      ? totalExpenses / daysWithData 
      : (daysInMonth > 0 && totalExpenses > 0 ? totalExpenses / daysInMonth : 0);

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
      averageDailyRevenue,
      averageDailyExpenses,
      daysWithData,
    };
  }

  async getYearlyReport(year: number, storeId?: number) {
    // Create date range - use local time
    const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
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

    // Calculate monthly statistics
    const monthlyRevenueMap = new Map<number, number>();
    const monthlyExpensesMap = new Map<number, number>();
    const monthsWithActivitySet = new Set<number>();

    // Group transactions by month (0-11)
    transactions.forEach((txn) => {
      const txnDate = new Date(txn.createdAt);
      const month = txnDate.getMonth();
      const current = monthlyRevenueMap.get(month) || 0;
      monthlyRevenueMap.set(month, current + Number(txn.amount));
      monthsWithActivitySet.add(month);
    });

    // Group expenses by month
    expenses.forEach((exp) => {
      const expDate = new Date(exp.createdAt);
      const month = expDate.getMonth();
      const current = monthlyExpensesMap.get(month) || 0;
      monthlyExpensesMap.set(month, current + Number(exp.totalAmount));
      monthsWithActivitySet.add(month);
    });

    // Group orders by month
    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const month = orderDate.getMonth();
      monthsWithActivitySet.add(month);
    });

    // Calculate months with data (months that have ANY activity)
    const monthsWithData = monthsWithActivitySet.size;

    // Calculate averages - divide by months with data, or by 12 if no data
    const averageMonthlyRevenue = monthsWithData > 0 
      ? totalRevenue / monthsWithData 
      : (totalRevenue > 0 ? totalRevenue / 12 : 0);
    const averageMonthlyExpenses = monthsWithData > 0 
      ? totalExpenses / monthsWithData 
      : (totalExpenses > 0 ? totalExpenses / 12 : 0);

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
      averageMonthlyRevenue,
      averageMonthlyExpenses,
      monthsWithData,
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

    // Helper function to check if weather conditions are similar
    const isSimilarWeather = (condition1: string, condition2: string): boolean => {
      if (!condition1 || !condition2) return false;
      const c1 = condition1.toLowerCase();
      const c2 = condition2.toLowerCase();
      
      // Exact match
      if (c1 === c2) return true;
      
      // Group similar conditions
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

    // Calculate weather-based adjustments
    let weatherMultiplier = 1.0;
    if (targetWeather && targetWeather.weatherJson) {
      const targetCondition = targetWeather.weatherJson.condition;
      
      // Find productions with similar weather conditions
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

      // Weather-specific adjustments based on condition type
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

