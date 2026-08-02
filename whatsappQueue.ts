/**
 * Gestionnaire de File d'Attente (Queue) WhatsApp (225 Chrétien)
 * Assure un envoi asynchrone régulé, un re-tentative automatique (Retry)
 * et empêche le spam et le bannissement par WhatsApp / OpenWA.
 */

import { secureLog, secureWarn, secureError, maskPhone } from './securityUtils';

export interface WhatsAppQueueJob {
  id: string;
  phone: string;
  messageText: string;
  attempts: number;
  maxAttempts: number;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  error?: string;
  createdAt: number;
  processedAt?: number;
}

export type QueueSenderFunction = (job: WhatsAppQueueJob) => Promise<{ success: boolean; message: string }>;

class WhatsAppQueueManager {
  private static instance: WhatsAppQueueManager;
  private queue: WhatsAppQueueJob[] = [];
  private isProcessing = false;
  private delayBetweenJobsMs = 1500; // 1.5s entre chaque envoi pour éviter le surchargement / rate limit
  private senderFunction: QueueSenderFunction | null = null;
  private listeners: Array<() => void> = [];

  private constructor() {}

  public static getInstance(): WhatsAppQueueManager {
    if (!WhatsAppQueueManager.instance) {
      WhatsAppQueueManager.instance = new WhatsAppQueueManager();
    }
    return WhatsAppQueueManager.instance;
  }

  /**
   * Enregistre la fonction d'envoi API (ex: sendWhatsAppMessageApi)
   */
  public registerSender(sender: QueueSenderFunction): void {
    this.senderFunction = sender;
  }

  /**
   * Ajoute un message à la file d'attente
   */
  public enqueue(phone: string, messageText: string, maxAttempts = 3): WhatsAppQueueJob {
    const job: WhatsAppQueueJob = {
      id: `wa-job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      phone,
      messageText,
      attempts: 0,
      maxAttempts,
      status: 'PENDING',
      createdAt: Date.now()
    };

    this.queue.push(job);
    secureLog('WhatsAppQueue', `Message enfilé pour ${maskPhone(phone)} (ID: ${job.id})`);
    this.notifyListeners();
    this.processQueue();

    return job;
  }

  /**
   * Traite la file d'attente séquentiellement
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (true) {
      const job = this.queue.find(j => j.status === 'PENDING');
      if (!job) break;

      if (!this.senderFunction) {
        secureWarn('WhatsAppQueue', 'Aucun expéditeur enregistré dans la file d\'attente.');
        break;
      }

      job.status = 'PROCESSING';
      job.attempts += 1;
      this.notifyListeners();

      secureLog('WhatsAppQueue', `Traitement du message ${job.id} vers ${maskPhone(job.phone)} (Essai ${job.attempts}/${job.maxAttempts})`);

      try {
        const result = await this.senderFunction(job);
        if (result.success) {
          job.status = 'SUCCESS';
          job.processedAt = Date.now();
          secureLog('WhatsAppQueue', `Message ${job.id} distribué avec succès à ${maskPhone(job.phone)}`);
        } else {
          if (job.attempts < job.maxAttempts) {
            job.status = 'PENDING'; // Remis en file d'attente pour retry
            const backoffMs = Math.pow(2, job.attempts) * 1000;
            secureWarn('WhatsAppQueue', `Échec temporaire ${job.id}. Nouvel essai dans ${backoffMs / 1000}s... Error: ${result.message}`);
            await new Promise(r => setTimeout(r, backoffMs));
          } else {
            job.status = 'FAILED';
            job.error = result.message;
            job.processedAt = Date.now();
            secureError('WhatsAppQueue', `Échec définitif du message ${job.id} après ${job.maxAttempts} essais. Error: ${result.message}`);
          }
        }
      } catch (err: any) {
        if (job.attempts < job.maxAttempts) {
          job.status = 'PENDING';
          await new Promise(r => setTimeout(r, 2000));
        } else {
          job.status = 'FAILED';
          job.error = err.message || 'Erreur inconnue';
          job.processedAt = Date.now();
        }
      }

      this.notifyListeners();
      // Délai de temporisation entre deux envois pour réguler le débit
      await new Promise(r => setTimeout(r, this.delayBetweenJobsMs));
    }

    this.isProcessing = false;
  }

  /**
   * Statistiques de la file d'attente
   */
  public getStats(): { pending: number; processing: number; success: number; failed: number; total: number } {
    const pending = this.queue.filter(j => j.status === 'PENDING').length;
    const processing = this.queue.filter(j => j.status === 'PROCESSING').length;
    const success = this.queue.filter(j => j.status === 'SUCCESS').length;
    const failed = this.queue.filter(j => j.status === 'FAILED').length;
    return { pending, processing, success, failed, total: this.queue.length };
  }

  /**
   * Récupère toutes les tâches de la file
   */
  public getJobs(): WhatsAppQueueJob[] {
    return [...this.queue];
  }

  /**
   * S'abonner aux changements d'état de la file d'attente
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }

  /**
   * Vider l'historique des tâches terminées
   */
  public clearCompleted(): void {
    this.queue = this.queue.filter(j => j.status === 'PENDING' || j.status === 'PROCESSING');
    this.notifyListeners();
  }
}

export const whatsAppQueue = WhatsAppQueueManager.getInstance();
