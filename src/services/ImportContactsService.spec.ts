import { Readable } from 'stream';
import mongoose from 'mongoose';

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

  it('should be able to import new contacts', async () => {
    const contactsFileStream = Readable.from([
      'arthur@email.com\n',
      'arthur@email.com.br\n',
      'arthur1@email.com\n',
    ]);

    const importContacts = new ImportContactsService();

    await importContacts.run(contactsFileStream, ['Students', 'Class A']);

    const createdTags = await Tag.find({}).lean();

    expect(createdTags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Students' }),
        expect.objectContaining({ title: 'Class A' }),
      ]),
    );

    const createdTagsIds = createdTags.map(tag => tag._id);

    const createdContacts = await Contact.find({}).lean();

    expect(createdContacts).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  it('should not recreate tags that already exists', async () => {
    const contactsFileStream = Readable.from([
      'arthur@email.com\n',
      'arthur@email.com.br\n',
      'arthur1@email.com\n',
    ]);

    const importContacts = new ImportContactsService();

    await Tag.create({ title: 'Students' });

    await importContacts.run(contactsFileStream, ['Students', 'Class A']);

    const createdTags = await Tag.find({}).lean();

    expect(createdTags).toEqual([
      expect.objectContaining({ title: 'Students' }),
      expect.objectContaining({ title: 'Class A' }),
    ]);
  });

  it('should not recreate contacts that already exists', async () => {
    const contactsFileStream = Readable.from([
      'arthur@email.com\n',
      'arthur@email.com.br\n',
      'arthur1@email.com\n',
    ]);

    const importContacts = new ImportContactsService();

    const tag = await Tag.create({ title: 'Students' });
    await Contact.create({ email: 'arthur@email.com', tags: [tag._id] });

    await importContacts.run(contactsFileStream, ['Class A']);

    const contact = await Contact.find({ email: 'arthur@email.com' })
      .populate('tags')
      .lean();

    expect(contact.length).toBe(1);
    expect(contact[0].tags).toEqual([
      expect.objectContaining({ title: 'Students' }),
      expect.objectContaining({ title: 'Class A' }),
    ]);
  });
});
