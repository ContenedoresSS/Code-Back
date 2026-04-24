/**
 * Generic wrapper for paginated data sets.
 * This structure is used to handle lists that are fetched in chunks or pages.
 * * @template T - The type of the items contained in the data array.
 */
export interface PaginationData<T> {
  /**
   * The collection of items for the current page or requested range.
   */
  data: T[];

  /**
   * The total number of records available on the database.
   */
  totalCount: number;
}
