// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';
import { AddressInfo, createServer } from 'net';
import { app, nativeTheme } from 'electron';
import { IPythonEnvironment } from './tokens';

export const DarkThemeBGColor = '#212121';
export const LightThemeBGColor = '#ffffff';

export interface ISaveOptions {
  id: string;
  raw: string;
}

export function isDevMode(): boolean {
  return require.main.filename.indexOf('app.asar') === -1;
}

export function getAppDir(): string {
  let appDir = app.getAppPath();
  if (!isDevMode()) {
    appDir = path.dirname(appDir);
  }

  return appDir;
}

export function getUserHomeDir(): string {
  return app.getPath('home');
}

export function getUserDataDir(): string {
  const userDataDir = app.getPath('userData');

  if (!fs.existsSync(userDataDir)) {
    try {
      fs.mkdirSync(userDataDir, { recursive: true });
    } catch (error) {
      log.error(error);
    }
  }

  return userDataDir;
}

export function getSchemasDir(): string {
  return path.normalize(path.join(getAppDir(), './build/schemas'));
}

export function getEnvironmentPath(environment: IPythonEnvironment): string {
  const isWin = process.platform === 'win32';
  const pythonPath = environment.path;
  let envPath = path.dirname(pythonPath);
  if (!isWin) {
    envPath = path.normalize(path.join(envPath, '../'));
  }

  return envPath;
}

export function getBundledPythonInstallDir(): string {
  // this directory path cannot have any spaces since
  // conda constructor cannot install to such paths
  const installDir =
    process.platform === 'darwin'
      ? path.normalize(path.join(app.getPath('home'), 'Library', app.getName()))
      : app.getPath('userData');

  if (!fs.existsSync(installDir)) {
    try {
      fs.mkdirSync(installDir, { recursive: true });
    } catch (error) {
      log.error(error);
    }
  }

  return installDir;
}

export function getBundledPythonEnvPath(): string {
  const userDataDir = getBundledPythonInstallDir();
  let envPath = path.join(userDataDir, 'jlab_server');

  return envPath;
}

export function getBundledPythonPath(): string {
  const platform = process.platform;
  let envPath = getBundledPythonEnvPath();
  if (platform !== 'win32') {
    envPath = path.join(envPath, 'bin');
  }

  const bundledPythonPath = path.join(
    envPath,
    `python${platform === 'win32' ? '.exe' : ''}`
  );

  return bundledPythonPath;
}

export function isDarkTheme(themeType: string) {
  if (themeType === 'light') {
    return false;
  } else if (themeType === 'dark') {
    return true;
  } else {
    return nativeTheme.shouldUseDarkColors;
  }
}

export function clearSession(session: Electron.Session): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      Promise.all([
        session.clearCache(),
        session.clearAuthCache(),
        session.clearStorageData()
      ]).then(() => {
        resolve();
      });
    } catch (error) {
      reject();
    }
  });
}

export function isPortInUse(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const server = createServer();
    server.once('error', err => {
      server.close();
      resolve(true);
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '127.0.0.1');
  });
}

export function getFreePort(): Promise<number> {
  return new Promise<number>(resolve => {
    const getPort = () => {
      const server = createServer(socket => {
        socket.write('Echo server\r\n');
        socket.pipe(socket);
      });

      server.on('error', function (e) {
        getPort();
      });
      server.on('listening', function (e: any) {
        const port = (server.address() as AddressInfo).port;
        server.close();

        resolve(port);
      });

      server.listen(0, '127.0.0.1');
    };

    getPort();
  });
}
