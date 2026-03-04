/**
 * Utilidades para compartir contenido via WhatsApp
 * Fase 4: Compartir listas y horarios con empleados y familiares
 */

export interface ShareableItem {
  name: string;
  quantity?: string;
  checked?: boolean;
}

export interface EmployeeSchedule {
  employeeName: string;
  date: string;
  tasks: {
    name: string;
    time?: string;
    space?: string;
  }[];
}

/**
 * Genera un mensaje formateado para lista de mercado
 */
export function formatMarketListForWhatsApp(
  items: ShareableItem[],
  title?: string,
): string {
  const header = title || "🛒 Lista de Mercado";
  const date = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const uncheckedItems = items.filter((item) => !item.checked);
  const checkedItems = items.filter((item) => item.checked);

  let message = `*${header}*\n`;
  message += `📅 ${date}\n\n`;

  if (uncheckedItems.length > 0) {
    message += `*Por comprar:*\n`;
    uncheckedItems.forEach((item) => {
      const qty = item.quantity ? ` (${item.quantity})` : "";
      message += `⬜ ${item.name}${qty}\n`;
    });
  }

  if (checkedItems.length > 0) {
    message += `\n*Ya comprado:*\n`;
    checkedItems.forEach((item) => {
      const qty = item.quantity ? ` (${item.quantity})` : "";
      message += `✅ ${item.name}${qty}\n`;
    });
  }

  message += `\n_Enviado desde Recetario App_`;

  return message;
}

/**
 * Genera un mensaje formateado para horario de empleado
 */
export function formatEmployeeScheduleForWhatsApp(
  schedule: EmployeeSchedule,
): string {
  const formattedDate = new Date(schedule.date).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  let message = `*🏠 Tareas del Día*\n`;
  message += `👤 ${schedule.employeeName}\n`;
  message += `📅 ${formattedDate}\n\n`;

  if (schedule.tasks.length === 0) {
    message += `_No hay tareas programadas_\n`;
  } else {
    message += `*Actividades:*\n`;
    schedule.tasks.forEach((task, index) => {
      const time = task.time ? `⏰ ${task.time} - ` : "";
      const space = task.space ? ` (${task.space})` : "";
      message += `${index + 1}. ${time}${task.name}${space}\n`;
    });
  }

  message += `\n_Enviado desde Recetario App_`;

  return message;
}

/**
 * Genera un mensaje formateado para menú del día
 */
export function formatDayMenuForWhatsApp(
  menu: {
    breakfast?: string;
    lunch?: string;
    dinner?: string | null;
  },
  date?: Date,
): string {
  const targetDate = date || new Date();
  const formattedDate = targetDate.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  let message = `*🍽️ Menú del Día*\n`;
  message += `📅 ${formattedDate}\n\n`;

  if (menu.breakfast) {
    message += `☀️ *Desayuno:* ${menu.breakfast}\n`;
  }

  if (menu.lunch) {
    message += `🌤️ *Almuerzo:* ${menu.lunch}\n`;
  }

  if (menu.dinner) {
    message += `🌙 *Cena:* ${menu.dinner}\n`;
  } else if (menu.dinner === null) {
    message += `🌙 *Cena:* No programada\n`;
  }

  message += `\n_Enviado desde Recetario App_`;

  return message;
}

/**
 * Genera un mensaje formateado para resumen semanal
 */
export function formatWeeklySummaryForWhatsApp(summary: {
  mealsCompleted: number;
  mealsTotal: number;
  tasksCompleted: number;
  tasksTotal: number;
  highlights?: string[];
}): string {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });

  let message = `*📊 Resumen Semanal*\n`;
  message += `📅 ${formatDate(weekStart)} - ${formatDate(weekEnd)}\n\n`;

  const mealsPercent =
    summary.mealsTotal > 0
      ? Math.round((summary.mealsCompleted / summary.mealsTotal) * 100)
      : 0;
  const tasksPercent =
    summary.tasksTotal > 0
      ? Math.round((summary.tasksCompleted / summary.tasksTotal) * 100)
      : 0;

  message += `🍽️ *Comidas:* ${summary.mealsCompleted}/${summary.mealsTotal} (${mealsPercent}%)\n`;
  message += `🏠 *Tareas:* ${summary.tasksCompleted}/${summary.tasksTotal} (${tasksPercent}%)\n`;

  if (summary.highlights && summary.highlights.length > 0) {
    message += `\n*Destacados:*\n`;
    summary.highlights.forEach((h) => {
      message += `• ${h}\n`;
    });
  }

  message += `\n_Enviado desde Recetario App_`;

  return message;
}

/**
 * Abre WhatsApp con el mensaje preformateado
 * @param message - El mensaje a enviar
 * @param phoneNumber - Número opcional (formato: código país + número, ej: 573001234567)
 */
export function openWhatsApp(message: string, phoneNumber?: string): void {
  const encodedMessage = encodeURIComponent(message);

  let url: string;
  if (phoneNumber) {
    // Limpiar número de caracteres no numéricos
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
  } else {
    // Abrir selector de contactos de WhatsApp
    url = `https://wa.me/?text=${encodedMessage}`;
  }

  // Abrir en nueva ventana/tab
  window.open(url, "_blank");
}

/**
 * Verifica si el dispositivo puede compartir via WhatsApp
 */
export function canShareViaWhatsApp(): boolean {
  // En móviles, siempre debería funcionar
  // En desktop, depende de si tienen WhatsApp Web o Desktop
  return typeof window !== "undefined";
}

/**
 * Copia el mensaje al portapapeles como alternativa
 */
export async function copyToClipboard(message: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(message);
    return true;
  } catch {
    // Fallback para navegadores que no soportan clipboard API
    const textArea = document.createElement("textarea");
    textArea.value = message;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
}
