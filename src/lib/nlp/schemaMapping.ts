import { tagCategories } from '@/lib/nlp/mapping';
import { type Metadata, type MetadataRowCSV } from '@/lib/nlp/schema';

const mapMetadataRowCSVToMetadata = (row: MetadataRowCSV): Metadata => {
  return {
    ...row,
    genre: {
      code: row.genreCode,
      category: row.genreCategory,
      vietnamese: row.genreVietnamese,
    },
    tags: row.tagCategory.map((tC) => {
      return {
        category: tC,
        vietnamese:
          // NOTE: MetadataSchema will validate whether the vietnamese
          // translation matches the category
          tagCategories.find((t) => t.category === tC)?.vietnamese || '',
      };
    }),
  };
};

export { mapMetadataRowCSVToMetadata };
