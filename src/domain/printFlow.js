import {
  Dimensions,
  Order,
  OrderStatus,
  Printer,
  PrinterStatus,
  PrintJob,
  PrintModel,
} from '../models';

export const MATERIAL_RATES = Object.freeze({
  PLA: 18,
  PETG: 24,
  ABS: 27,
});

export const PREPARATION_FEE = 250;

export const DEFAULT_BUILD_VOLUME = Object.freeze({
  x_mm: 220,
  y_mm: 220,
  z_mm: 250,
});

export function calculatePrice({ volume_cm3, material, quantity }) {
  const rate = MATERIAL_RATES[material] ?? MATERIAL_RATES.PLA;
  const modelVolume = Number(volume_cm3) || 0;
  const copies = Number(quantity) || 1;

  return Math.round(modelVolume * rate * copies + PREPARATION_FEE);
}

export function validatePrintModelInput(input, buildVolume = DEFAULT_BUILD_VOLUME) {
  const errors = [];
  const fileName = String(input.fileName ?? '').trim();
  const volume = Number(input.volume_cm3);
  const x = Number(input.x_mm ?? input.size?.x_mm);
  const y = Number(input.y_mm ?? input.size?.y_mm);
  const z = Number(input.z_mm ?? input.size?.z_mm);

  if (!fileName) errors.push('Укажите имя STL-файла.');
  if (fileName && !fileName.toLowerCase().endsWith('.stl')) {
    errors.push('Файл модели должен иметь расширение .stl.');
  }
  if (!volume || volume <= 0) errors.push('Объем модели должен быть больше 0 см3.');
  if (!x || x <= 0 || !y || y <= 0 || !z || z <= 0) {
    errors.push('Габариты модели должны быть больше 0 мм по всем осям.');
  }
  if (x > buildVolume.x_mm || y > buildVolume.y_mm || z > buildVolume.z_mm) {
    errors.push(
      `Модель не помещается в область печати ${buildVolume.x_mm}x${buildVolume.y_mm}x${buildVolume.z_mm} мм.`,
    );
  }

  return errors;
}

export function createPrintModel(input, buildVolume = DEFAULT_BUILD_VOLUME) {
  const size = new Dimensions(Number(input.x_mm), Number(input.y_mm), Number(input.z_mm));
  const validationErrors = validatePrintModelInput(input, buildVolume);

  return new PrintModel({
    fileName: input.fileName.trim(),
    stlPath: `mock://uploads/${input.fileName.trim()}`,
    volume_cm3: Number(input.volume_cm3),
    size,
    material: input.material,
    color: input.color.trim() || 'Natural',
    quantity: Number(input.quantity) || 1,
    validationErrors,
  });
}

export function createOrderFromInput(input) {
  const model = createPrintModel(input);
  const order = new Order({
    customerName: input.customerName.trim(),
    customerContact: input.customerContact.trim(),
    title: input.title.trim(),
    status: model.validationErrors.length ? OrderStatus.VALIDATING : OrderStatus.VALIDATED,
    totalPrice: model.validationErrors.length ? 0 : calculatePrice(model),
  });

  order.models = [model];
  return order;
}

export function createPrintJobForOrder(order, priority = 0) {
  const model = order.models[0];
  const job = new PrintJob({
    orderId: order.id,
    modelId: model?.id ?? '',
    gcodePath: `mock://gcode/${order.id}.gcode`,
    priority,
  });

  return job;
}

export function createSeedPrinters() {
  return Array.from({ length: 19 }, (_, index) => {
    const number = index + 1;
    const status =
      number === 6
        ? PrinterStatus.MAINTENANCE
        : number === 11
          ? PrinterStatus.OFFLINE
          : PrinterStatus.IDLE;

    return new Printer({
      id: `printer-${String(number).padStart(2, '0')}`,
      modelName: number <= 12 ? `Bambu Lab P1S #${number}` : `Creality K1 #${number}`,
      status,
      nozzleTemp: status === PrinterStatus.IDLE ? 28 : 0,
      bedTemp: status === PrinterStatus.IDLE ? 24 : 0,
      buildVolume: DEFAULT_BUILD_VOLUME,
    });
  });
}

export function updateOrderStatus(order, status, updates = {}) {
  return {
    ...order,
    status,
    ...updates,
  };
}

export function createBlankOrderForm() {
  return {
    customerName: '',
    customerContact: '',
    title: '',
    fileName: '',
    material: 'PLA',
    color: 'Белый',
    volume_cm3: 12,
    x_mm: 40,
    y_mm: 40,
    z_mm: 40,
    quantity: 1,
  };
}

export function createDemoOrder() {
  return {
    id: 'demo-order-001',
    customerName: 'Иркутский технопарк',
    customerContact: '+7 3952 000-000',
    title: 'Корпус датчика',
    status: OrderStatus.IN_QUEUE,
    createdAt: new Date().toISOString(),
    totalPrice: calculatePrice({ volume_cm3: 38, material: 'PETG', quantity: 2 }),
    assignedPrinterId: null,
    printJobId: 'demo-job-001',
    models: [
      {
        id: 'demo-model-001',
        fileName: 'sensor-case.stl',
        stlPath: 'mock://uploads/sensor-case.stl',
        volume_cm3: 38,
        size: { x_mm: 86, y_mm: 54, z_mm: 28 },
        material: 'PETG',
        color: 'Черный',
        quantity: 2,
        validationErrors: [],
      },
    ],
    qcReport: null,
  };
}
