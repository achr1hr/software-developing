import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { OrderStatus, PrinterStatus } from './models';
import { QCReport } from './models/QCReport';
import {
  MATERIAL_RATES,
  calculatePrice,
  createBlankOrderForm,
  createDemoOrder,
  createOrderFromInput,
  createPrintJobForOrder,
  createSeedPrinters,
  updateOrderStatus,
  validatePrintModelInput,
} from './domain/printFlow';

const STORAGE_KEY = 'printflow.mvp.state';

const tabs = [
  { id: 'new', label: 'Новый заказ' },
  { id: 'orders', label: 'Заказы' },
  { id: 'queue', label: 'Очередь' },
  { id: 'printers', label: 'Принтеры' },
  { id: 'qc', label: 'QC' },
];

const statusLabels = {
  [OrderStatus.NEW]: 'Новый',
  [OrderStatus.VALIDATING]: 'Проверка',
  [OrderStatus.VALIDATED]: 'Проверен',
  [OrderStatus.PAID]: 'Оплачен',
  [OrderStatus.IN_QUEUE]: 'В очереди',
  [OrderStatus.PRINTING]: 'Печать',
  [OrderStatus.POST_PROCESSING]: 'Пост-обработка',
  [OrderStatus.READY]: 'Готов',
  [OrderStatus.DELIVERED]: 'Выдан',
};

const statusSteps = Object.values(OrderStatus);

const printerLabels = {
  [PrinterStatus.IDLE]: 'Свободен',
  [PrinterStatus.PRINTING]: 'Печатает',
  [PrinterStatus.MAINTENANCE]: 'ТО',
  [PrinterStatus.ERROR]: 'Ошибка',
  [PrinterStatus.OFFLINE]: 'Офлайн',
};

function loadInitialState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    orders: [createDemoOrder()],
    jobs: [
      {
        jobID: 'demo-job-001',
        orderId: 'demo-order-001',
        modelId: 'demo-model-001',
        gcodePath: 'mock://gcode/demo-job-001.gcode',
        startTime: null,
        priority: 1,
        printer: null,
      },
    ],
    printers: createSeedPrinters(),
  };
}

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function getPrimaryModel(order) {
  return order.models?.[0] ?? {};
}

function App() {
  const [activeTab, setActiveTab] = useState('new');
  const [form, setForm] = useState(createBlankOrderForm);
  const [{ orders, jobs, printers }, setState] = useState(loadInitialState);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [qcDrafts, setQcDrafts] = useState({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders, jobs, printers }));
  }, [orders, jobs, printers]);

  const validationErrors = useMemo(() => validatePrintModelInput(form), [form]);
  const previewPrice = useMemo(() => calculatePrice(form), [form]);

  const metrics = useMemo(() => {
    const queueCount = orders.filter((order) => order.status === OrderStatus.IN_QUEUE).length;
    const printingCount = orders.filter((order) => order.status === OrderStatus.PRINTING).length;
    const readyCount = orders.filter((order) => order.status === OrderStatus.READY).length;
    const availablePrinters = printers.filter(
      (printer) => printer.status === PrinterStatus.IDLE,
    ).length;

    return { queueCount, printingCount, readyCount, availablePrinters };
  }, [orders, printers]);

  const filteredOrders =
    statusFilter === 'ALL' ? orders : orders.filter((order) => order.status === statusFilter);

  const queueOrders = orders.filter((order) => order.status === OrderStatus.IN_QUEUE);
  const qcOrders = orders.filter((order) => order.status === OrderStatus.POST_PROCESSING);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateOrders = (updater) => {
    setState((current) => ({ ...current, orders: updater(current.orders) }));
  };

  const handleCreateOrder = (event) => {
    event.preventDefault();
    const order = createOrderFromInput(form);

    setState((current) => ({ ...current, orders: [order, ...current.orders] }));
    setForm(createBlankOrderForm());
    setActiveTab('orders');
  };

  const confirmPayment = (orderId) => {
    setState((current) => {
      const order = current.orders.find((item) => item.id === orderId);
      const job = createPrintJobForOrder(order, current.jobs.length + 1);

      return {
        ...current,
        jobs: [job, ...current.jobs],
        orders: current.orders.map((item) =>
          item.id === orderId
            ? updateOrderStatus(item, OrderStatus.IN_QUEUE, { printJobId: job.jobID })
            : item,
        ),
      };
    });
  };

  const moveToNextStatus = (orderId) => {
    updateOrders((currentOrders) =>
      currentOrders.map((order) => {
        if (order.id !== orderId) return order;
        const nextIndex = Math.min(statusSteps.indexOf(order.status) + 1, statusSteps.length - 1);
        return updateOrderStatus(order, statusSteps[nextIndex]);
      }),
    );
  };

  const assignPrinter = (orderId, printerId) => {
    setState((current) => {
      const printer = current.printers.find((item) => item.id === printerId);
      if (!printer || printer.status !== PrinterStatus.IDLE) return current;

      return {
        ...current,
        printers: current.printers.map((item) =>
          item.id === printerId
            ? { ...item, status: PrinterStatus.PRINTING, nozzleTemp: 215, bedTemp: 60 }
            : item,
        ),
        jobs: current.jobs.map((job) =>
          job.orderId === orderId
            ? { ...job, printer: printerId, startTime: new Date().toISOString() }
            : job,
        ),
        orders: current.orders.map((order) =>
          order.id === orderId
            ? updateOrderStatus(order, OrderStatus.PRINTING, { assignedPrinterId: printerId })
            : order,
        ),
      };
    });
  };

  const finishPrinting = (orderId) => {
    setState((current) => {
      const order = current.orders.find((item) => item.id === orderId);

      return {
        ...current,
        printers: current.printers.map((printer) =>
          printer.id === order?.assignedPrinterId
            ? { ...printer, status: PrinterStatus.IDLE, nozzleTemp: 32, bedTemp: 28 }
            : printer,
        ),
        orders: current.orders.map((item) =>
          item.id === orderId ? updateOrderStatus(item, OrderStatus.POST_PROCESSING) : item,
        ),
      };
    });
  };

  const submitQc = (orderId, isPassed) => {
    const draft = qcDrafts[orderId] ?? { comments: '', photoUrl: '' };
    const report = new QCReport({
      isPassed,
      comments: draft.comments,
      photoUrl: draft.photoUrl,
    });

    updateOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? updateOrderStatus(order, isPassed ? OrderStatus.READY : OrderStatus.POST_PROCESSING, {
              qcReport: report,
            })
          : order,
      ),
    );
    setQcDrafts((current) => ({ ...current, [orderId]: { comments: '', photoUrl: '' } }));
  };

  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(loadInitialState());
    setForm(createBlankOrderForm());
    setActiveTab('new');
  };

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Сводка PrintFlow">
        <div>
          <p className="eyebrow">PrintFlow MVP</p>
          <h1>Производственный контур 3D-печати</h1>
        </div>
        <button className="ghost-button" type="button" onClick={resetDemo}>
          Сбросить демо
        </button>
      </section>

      <section className="metrics-grid" aria-label="Операционные показатели">
        <Metric label="В очереди" value={metrics.queueCount} />
        <Metric label="Печатаются" value={metrics.printingCount} />
        <Metric label="Готовы" value={metrics.readyCount} />
        <Metric label="Свободные принтеры" value={metrics.availablePrinters} />
      </section>

      <nav className="tabs" aria-label="Разделы MVP">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? 'tab active' : 'tab'}
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'new' && (
        <section className="workspace two-column">
          <form className="panel form-grid" onSubmit={handleCreateOrder}>
            <h2>Создание заказа</h2>
            <TextField
              label="Клиент"
              value={form.customerName}
              onChange={updateForm}
              name="customerName"
              required
            />
            <TextField
              label="Контакт"
              value={form.customerContact}
              onChange={updateForm}
              name="customerContact"
              required
            />
            <TextField
              label="Изделие"
              value={form.title}
              onChange={updateForm}
              name="title"
              required
            />
            <TextField
              label="STL-файл"
              value={form.fileName}
              onChange={updateForm}
              name="fileName"
              required
            />

            <label className="field">
              <span>Материал</span>
              <select
                value={form.material}
                onChange={(event) => updateForm('material', event.target.value)}
              >
                {Object.keys(MATERIAL_RATES).map((material) => (
                  <option key={material}>{material}</option>
                ))}
              </select>
            </label>
            <TextField label="Цвет" value={form.color} onChange={updateForm} name="color" />
            <NumberField
              label="Объем, см3"
              value={form.volume_cm3}
              onChange={updateForm}
              name="volume_cm3"
            />
            <NumberField
              label="Количество"
              value={form.quantity}
              onChange={updateForm}
              name="quantity"
            />
            <NumberField label="X, мм" value={form.x_mm} onChange={updateForm} name="x_mm" />
            <NumberField label="Y, мм" value={form.y_mm} onChange={updateForm} name="y_mm" />
            <NumberField label="Z, мм" value={form.z_mm} onChange={updateForm} name="z_mm" />

            <button className="primary-button wide" type="submit">
              Создать заказ
            </button>
          </form>

          <aside className="panel">
            <h2>Предварительная проверка</h2>
            <div className="price-preview">{formatMoney(previewPrice)}</div>
            {validationErrors.length ? (
              <ul className="validation-list">
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : (
              <p className="success-text">
                Модель проходит формальную проверку и готова к расчету.
              </p>
            )}
          </aside>
        </section>
      )}

      {activeTab === 'orders' && (
        <section className="workspace">
          <div className="toolbar">
            <h2>Заказы</h2>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">Все статусы</option>
              {statusSteps.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </div>
          <OrderList
            orders={filteredOrders}
            printers={printers}
            onConfirmPayment={confirmPayment}
            onNextStatus={moveToNextStatus}
            onFinishPrinting={finishPrinting}
          />
        </section>
      )}

      {activeTab === 'queue' && (
        <section className="workspace">
          <h2>Очередь печати</h2>
          {queueOrders.length ? (
            <div className="card-grid">
              {queueOrders.map((order) => (
                <QueueCard
                  key={order.id}
                  order={order}
                  printers={printers}
                  onAssignPrinter={assignPrinter}
                />
              ))}
            </div>
          ) : (
            <EmptyState text="Очередь пуста. Подтвержденные заказы появятся здесь." />
          )}
        </section>
      )}

      {activeTab === 'printers' && (
        <section className="workspace">
          <h2>Парк принтеров</h2>
          <div className="printer-grid">
            {printers.map((printer) => (
              <article className="printer-row" key={printer.id}>
                <div>
                  <strong>{printer.modelName}</strong>
                  <span>{printer.id}</span>
                </div>
                <StatusBadge status={printer.status} type="printer" />
                <span>{printer.nozzleTemp} C nozzle</span>
                <span>{printer.bedTemp} C bed</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'qc' && (
        <section className="workspace">
          <h2>Контроль качества</h2>
          {qcOrders.length ? (
            <div className="card-grid">
              {qcOrders.map((order) => {
                const draft = qcDrafts[order.id] ?? { comments: '', photoUrl: '' };

                return (
                  <article className="order-card" key={order.id}>
                    <OrderSummary order={order} printers={printers} />
                    <label className="field">
                      <span>Комментарий QC</span>
                      <textarea
                        value={draft.comments}
                        onChange={(event) =>
                          setQcDrafts((current) => ({
                            ...current,
                            [order.id]: { ...draft, comments: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <TextField
                      label="Фото/ссылка"
                      value={draft.photoUrl}
                      onChange={(name, value) =>
                        setQcDrafts((current) => ({
                          ...current,
                          [order.id]: { ...draft, [name]: value },
                        }))
                      }
                      name="photoUrl"
                    />
                    <div className="button-row">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => submitQc(order.id, false)}
                      >
                        На доработку
                      </button>
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => submitQc(order.id, true)}
                      >
                        QC пройден
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState text="Нет заказов на пост-обработке." />
          )}
        </section>
      )}
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TextField({ label, name, value, onChange, required = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        required={required}
        type="text"
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
      />
    </label>
  );
}

function NumberField({ label, name, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        min="1"
        required
        type="number"
        value={value}
        onChange={(event) => onChange(name, Number(event.target.value))}
      />
    </label>
  );
}

function OrderList({ orders, printers, onConfirmPayment, onNextStatus, onFinishPrinting }) {
  if (!orders.length) return <EmptyState text="Заказов с выбранным статусом нет." />;

  return (
    <div className="card-grid">
      {orders.map((order) => (
        <article className="order-card" key={order.id}>
          <OrderSummary order={order} printers={printers} />
          <div className="button-row">
            {order.status === OrderStatus.VALIDATED && (
              <button
                className="primary-button"
                type="button"
                onClick={() => onConfirmPayment(order.id)}
              >
                Оплата подтверждена
              </button>
            )}
            {order.status === OrderStatus.PRINTING && (
              <button
                className="primary-button"
                type="button"
                onClick={() => onFinishPrinting(order.id)}
              >
                Печать завершена
              </button>
            )}
            {[OrderStatus.NEW, OrderStatus.READY].includes(order.status) && (
              <button className="ghost-button" type="button" onClick={() => onNextStatus(order.id)}>
                Следующий статус
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function OrderSummary({ order, printers }) {
  const model = getPrimaryModel(order);
  const printer = printers.find((item) => item.id === order.assignedPrinterId);

  return (
    <>
      <div className="card-header">
        <div>
          <p>{order.customerName}</p>
          <h3>{order.title}</h3>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <dl className="details">
        <div>
          <dt>Модель</dt>
          <dd>{model.fileName}</dd>
        </div>
        <div>
          <dt>Материал</dt>
          <dd>
            {model.material}, {model.color}
          </dd>
        </div>
        <div>
          <dt>Габариты</dt>
          <dd>
            {model.size?.x_mm}x{model.size?.y_mm}x{model.size?.z_mm} мм
          </dd>
        </div>
        <div>
          <dt>Стоимость</dt>
          <dd>{formatMoney(order.totalPrice)}</dd>
        </div>
        <div>
          <dt>Принтер</dt>
          <dd>{printer?.modelName ?? 'Не назначен'}</dd>
        </div>
        <div>
          <dt>QC</dt>
          <dd>
            {order.qcReport ? (order.qcReport.isPassed ? 'Пройден' : 'Доработка') : 'Нет отчета'}
          </dd>
        </div>
      </dl>
      {model.validationErrors?.length > 0 && (
        <ul className="validation-list compact">
          {model.validationErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function QueueCard({ order, printers, onAssignPrinter }) {
  const idlePrinters = printers.filter((printer) => printer.status === PrinterStatus.IDLE);
  const [selectedPrinter, setSelectedPrinter] = useState(idlePrinters[0]?.id ?? '');

  useEffect(() => {
    setSelectedPrinter(idlePrinters[0]?.id ?? '');
  }, [idlePrinters.length]);

  return (
    <article className="order-card">
      <OrderSummary order={order} printers={printers} />
      <label className="field">
        <span>Свободный принтер</span>
        <select
          value={selectedPrinter}
          onChange={(event) => setSelectedPrinter(event.target.value)}
        >
          {idlePrinters.map((printer) => (
            <option key={printer.id} value={printer.id}>
              {printer.modelName}
            </option>
          ))}
        </select>
      </label>
      <button
        className="primary-button wide"
        disabled={!selectedPrinter}
        type="button"
        onClick={() => onAssignPrinter(order.id, selectedPrinter)}
      >
        Назначить печать
      </button>
    </article>
  );
}

function StatusBadge({ status, type = 'order' }) {
  const label = type === 'printer' ? printerLabels[status] : statusLabels[status];

  return <span className={`status status-${status.toLowerCase()}`}>{label ?? status}</span>;
}

function EmptyState({ text }) {
  return <p className="empty-state">{text}</p>;
}

export default App;
