import { systemSettingsRepository } from '../repositories/systemSettingsRepository.js';

export const systemSettingsService = {
  async getAdminContact() {
    const adminContact = await systemSettingsRepository.getAdminContact();
    return { adminContact };
  },

  async setAdminContact(adminContact) {
    await systemSettingsRepository.setAdminContact(
      adminContact == null ? '' : String(adminContact)
    );
    return this.getAdminContact();
  },
};
