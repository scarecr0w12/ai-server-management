import { NodeSSH } from 'node-ssh';

export interface DeployOptions {
  host: string;
  username: string;
  port?: number;
  privateKey?: string; // path to key
  password?: string;   // fallback (not recommended)
  agentLocalPath?: string; // path to compiled agent binary or script
}

export class SSHService {
  private ssh = new NodeSSH();

  /**
   * Establish an SSH connection.
   */
  async connect(opts: DeployOptions): Promise<void> {
    await this.ssh.connect({
      host: opts.host,
      username: opts.username,
      port: opts.port ?? 22,
      privateKey: opts.privateKey,
      password: opts.password,
      tryKeyboard: true,
    });
  }

  /**
   * Copy the monitoring agent to the remote host and start it (background).
   * The agent is assumed to be a standalone binary or Node script that reports
   * metrics back to the backend via HTTP/WebSocket.
   */
  async deployAgent(opts: DeployOptions): Promise<void> {
    if (!opts.agentLocalPath) throw new Error('agentLocalPath is required');
    const remotePath = `/tmp/agent_${Date.now()}`;

    await this.ssh.putFile(opts.agentLocalPath, remotePath);

    // Make executable & start in background (nohup)
    await this.ssh.execCommand(`chmod +x ${remotePath} && nohup ${remotePath} > /tmp/agent.log 2>&1 &`);
  }

  /**
   * Run arbitrary command on server.
   */
  async exec(cmd: string): Promise<string> {
    const res = await this.ssh.execCommand(cmd);
    if (res.stderr) throw new Error(res.stderr);
    return res.stdout;
  }

  /**
   * Disconnect from SSH.
   */
  dispose(): void {
    this.ssh.dispose();
  }
}
