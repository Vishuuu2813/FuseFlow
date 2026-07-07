import { BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys';
import WhatsAppSession from '../models/WhatsAppSession.js';
import WhatsAppSessionKey from '../models/WhatsAppSessionKey.js';

export const useMongoAuthState = async (tenantId, sessionId) => {
  // Fetch session from DB
  let session = await WhatsAppSession.findById(sessionId);
  if (!session) {
    throw new Error('WhatsApp session not found in database');
  }

  // Parse credentials if already existing, otherwise generate new ones
  let creds;
  if (session.creds) {
    creds = JSON.parse(JSON.stringify(session.creds), BufferJSON.reviver);
  } else {
    creds = initAuthCreds();
  }

  const writeData = async (data, keyId) => {
    try {
      const value = JSON.parse(JSON.stringify(data, BufferJSON.replacer));
      await WhatsAppSessionKey.findOneAndUpdate(
        { tenantId, sessionId, keyId },
        { data: value },
        { upsert: true }
      );
    } catch (err) {
      // Quiet fail or handle log
    }
  };

  const readData = async (keyId) => {
    try {
      const doc = await WhatsAppSessionKey.findOne({ sessionId, keyId });
      if (!doc) return null;
      return JSON.parse(JSON.stringify(doc.data), BufferJSON.reviver);
    } catch (error) {
      return null;
    }
  };

  const removeData = async (keyId) => {
    try {
      await WhatsAppSessionKey.deleteOne({ sessionId, keyId });
    } catch (err) {
      // Quiet fail
    }
  };

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (value) {
                if (type === 'app-state-sync-key') {
                  value = proto.Message.AppStateSyncKeyData.fromObject(value);
                }
                data[id] = value;
              }
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const keyId = `${category}-${id}`;
              if (value) {
                tasks.push(writeData(value, keyId));
              } else {
                tasks.push(removeData(keyId));
              }
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await WhatsAppSession.findByIdAndUpdate(sessionId, {
        creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
      });
    },
  };
};
