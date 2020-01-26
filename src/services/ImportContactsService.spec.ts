import mongoose from 'mongoose';
import { Readable } from 'stream';

import ImportContactsService from '@services/ImportContactsService';
import Contact from '@schemas/Contact';
import Tag from '@schemas/Tag';

describe('Import', () => {
  beforeAll(async () => {
    if (!process.env.MONGO_URL) {
      throw new Error('MongoDB server not initialized');
    }

    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Contact.deleteMany({});
  });

  it('shold be able to import new contacts', async () => {
    const contactsFileStream = Readable.from([
      'arthur@email.com',
      'arthur@email.com.br',
      'arthur1@email.com',
    ]);

    const importContacts = new ImportContactsService();

    await importContacts.run(contactsFileStream, ['Students', 'Class A']);

    const createTags = await Tag.find({});

    expect(createTags).toEqual([
      expect.objectContaining({ title: 'Students' }),
      expect.objectContaining({ title: 'Class A' }),
    ]);

    const createdTagsIds = createTags.map(tag => tag._id);

    const CreatedContacts = await Contact.find({});

    expect(CreatedContacts).toEqual([
      expect.objectContaining({
        email: 'arthur@email.com',
        tags: createdTagsIds,
      }),
      expect.objectContaining({
        email: 'arthur@email.com.br',
        tags: createdTagsIds,
      }),
      expect.objectContaining({
        email: 'arthur1@email.com',
        tags: createdTagsIds,
      }),
    ]);
  });
});
