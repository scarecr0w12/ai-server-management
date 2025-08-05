export interface Server {
  id: string;
  name: string;
  status: string;
  load: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
  uptime: number;
  lastCheck: string;
  alerts: number;
  services: {
    running: number;
    total: number;
  };
}

import { Pool } from 'pg';
import crypto from 'crypto';

// Row shape returned by the servers + server_metrics LEFT JOIN
interface ServerRow {
  id: string;
  name: string;
  status: string;
  load_avg: number | null;
  mem_used: number | null;
  mem_total: number | null;
  disk_used: number | null;
  disk_total: number | null;
  cpu_usage: number | null;
  cpu_cores: number | null;
  bytes_in: number | null;
  bytes_out: number | null;
  uptime: number | null;
  last_check: Date | null;
}


export class ServerManager {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    this.init();
  }

  /**
   * Initialise required tables if they do not yet exist. This avoids the need for
   * an external migration step for this initial feature.
   */
  private async init(): Promise<void> {
    // Basic server metadata (no metrics yet – collected by agent later).
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS servers (
        id          UUID PRIMARY KEY,
        name        TEXT NOT NULL,
        host        TEXT NOT NULL,
        ssh_user    TEXT,
        ssh_port    INTEGER DEFAULT 22,
        status      TEXT DEFAULT 'provisioning',
        last_check  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Latest metrics per server (separate table for extensibility)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS server_metrics (
        server_id   UUID REFERENCES servers(id) ON DELETE CASCADE,
        cpu_usage   REAL,
        cpu_cores   INTEGER,
        mem_used    REAL,
        mem_total   REAL,
        disk_used   REAL,
        disk_total  REAL,
        load_avg    REAL,
        bytes_in    BIGINT,
        bytes_out   BIGINT,
        uptime      BIGINT,
        collected_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (server_id)
      );
    `);
  }

  // -------------------- Public API -------------------- //

  async getServers(): Promise<Server[]> {
    const { rows: servers } = await this.pool.query(`
      SELECT s.*, m.cpu_usage, m.cpu_cores, m.mem_used, m.mem_total, m.disk_used, m.disk_total,
             m.load_avg, m.bytes_in, m.bytes_out, m.uptime
      FROM servers s
      LEFT JOIN server_metrics m ON m.server_id = s.id;
    `);

    // Adapt DB shape to the Server interface expected by frontend.
    return (servers as ServerRow[]).map((row) => this.rowToServer(row));
  }

  async getServerStatus(serverId: string): Promise<Server | null> {
    const { rows } = await this.pool.query(
      `SELECT s.*, m.cpu_usage, m.cpu_cores, m.mem_used, m.mem_total, m.disk_used, m.disk_total,
              m.load_avg, m.bytes_in, m.bytes_out, m.uptime
       FROM servers s
       LEFT JOIN server_metrics m ON m.server_id = s.id
       WHERE s.id = $1`,
      [serverId]
    );
    return rows[0] ? this.rowToServer(rows[0] as ServerRow) : null;
  }

  async handleAction(action: any): Promise<any> {
    // Placeholder – real actions (restart, stop service, etc.) will be implemented later.
    return { success: true, message: `Action ${action.type} processed for server ${action.serverId}` };
  }

  async updateServerStatus(serverId: string, status: Server['status']): Promise<void> {
    await this.pool.query('UPDATE servers SET status = $1, last_check = NOW() WHERE id = $2', [status, serverId]);
  }

  async addServer(serverData: Partial<Omit<Server, 'id' | 'lastCheck'>> & { host: string; ssh_user?: string; ssh_port?: number; }): Promise<Server> {
    const id = crypto.randomUUID();
    const {
      name = 'Unnamed Server',
      host,
      ssh_user = null,
      ssh_port = 22,
      status = 'provisioning',
    } = serverData;

    await this.pool.query(
      `INSERT INTO servers (id, name, host, ssh_user, ssh_port, status, last_check)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [id, name, host, ssh_user, ssh_port, status]
    );

    const server: Server = {
      id,
      name,
      status,
      load: 0,
      memory: { used: 0, total: 0, percentage: 0 },
      cpu: { usage: 0, cores: 0 },
      disk: { used: 0, total: 0, percentage: 0 },
      network: { bytesIn: 0, bytesOut: 0 },
      uptime: 0,
      lastCheck: new Date().toISOString(),
      alerts: 0,
      services: { running: 0, total: 0 },
    };
    return server;
  }

  // -------------------- Helpers -------------------- //

  private rowToServer(row: ServerRow): Server {
    const memPercentage = row.mem_total ? ((row.mem_used ?? 0) / row.mem_total) * 100 : 0;
    const diskPct = row.disk_total ? ((row.disk_used ?? 0) / row.disk_total) * 100 : 0;
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      load: row.load_avg ?? 0,
      memory: {
        used: row.mem_used ?? 0,
        total: row.mem_total ?? 0,
        percentage: memPercentage,
      },
      cpu: {
        usage: row.cpu_usage ?? 0,
        cores: row.cpu_cores ?? 0,
      },
      disk: {
        used: row.disk_used ?? 0,
        total: row.disk_total ?? 0,
        percentage: diskPct,
      },
      network: {
        bytesIn: row.bytes_in ?? 0,
        bytesOut: row.bytes_out ?? 0,
      },
      uptime: row.uptime ?? 0,
      lastCheck: row.last_check ? new Date(row.last_check).toISOString() : new Date().toISOString(),
      alerts: 0,
      services: {
        running: 0,
        total: 0,
      },
    };
  }
}

/*
  {
    id: 'server-1',
    name: 'Web Server 1',
    status: 'online',
    load: 45,
    memory: {
      used: 3.2,
      total: 8,
      percentage: 40,
        used: 3.2,
        total: 8,
        percentage: 40,
      },
      cpu: {
        usage: 45,
        cores: 8,
      },
      disk: {
        used: 120,
        total: 500,
        percentage: 24,
      },
      network: {
        bytesIn: 1024000,
        bytesOut: 2048000,
      },
      uptime: 86400,
      lastCheck: new Date().toISOString(),
      alerts: 0,
      services: {
        running: 12,
        total: 15,
      },
    },
    {
      id: 'server-2',
      name: 'Database Server',
      status: 'online',
      load: 65,
      memory: {
        used: 12.1,
        total: 16,
        percentage: 75.6,
      },
      cpu: {
        usage: 65,
        cores: 16,
      },
      disk: {
        used: 350,
        total: 1000,
        percentage: 35,
      },
      network: {
        bytesIn: 2048000,
        bytesOut: 4096000,
      },
      uptime: 172800,
      lastCheck: new Date().toISOString(),
      alerts: 2,
      services: {
        running: 8,
        total: 10,
      },
    },
    {
      id: 'server-3',
      name: 'Cache Server',
      status: 'maintenance',
      load: 5,
      memory: {
        used: 0.5,
        total: 4,
        percentage: 12.5,
      },
      cpu: {
        usage: 5,
        cores: 4,
      },
      disk: {
        used: 20,
        total: 100,
        percentage: 20,
      },
      network: {
        bytesIn: 512000,
        bytesOut: 1024000,
      },
      uptime: 43200,
      lastCheck: new Date().toISOString(),
      alerts: 1,
      services: {
        running: 3,
        total: 5,
      },
    },
  async getServers(): Promise<Server[]> {
    // In a real implementation, this would fetch from a database
    return this.servers;
  }

  async getServerStatus(serverId: string): Promise<Server | null> {
    // In a real implementation, this would fetch server status from monitoring systems
    const server = this.servers.find(s => s.id === serverId);
    if (server) {
      // Update with current status (simulate real-time data)
      return {
        ...server,
        load: Math.floor(Math.random() * 100),
        memory: {
          ...server.memory,
          used: Math.floor(Math.random() * server.memory.total * 100) / 100
        },
        lastCheck: new Date().toISOString()
      };
    }
    return null;
  }

  async handleAction(action: any): Promise<any> {
    // In a real implementation, this would handle server actions
    return {
      success: true,
      message: `Action ${action.type} processed for server ${action.serverId}`,
    };
  }

  async updateServerStatus(serverId: string, status: Server['status']): Promise<void> {
    const server = this.servers.find(s => s.id === serverId);
    if (server) {
      server.status = status;
      server.lastCheck = new Date().toISOString();
    }
  }

    const newServer: Server = {
      ...serverData,
      lastCheck: new Date().toISOString()
    };
    this.servers.push(newServer);
    return newServer;
  }
*/

