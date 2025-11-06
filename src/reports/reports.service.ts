import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from '../entities/order.entity';
import { Transaction } from '../entities/transaction.entity';
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
      where: { ...where, status: 'paid' },
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
      where: { ...where, status: 'paid' },
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
      where: { ...where, status: 'paid' },
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
}

