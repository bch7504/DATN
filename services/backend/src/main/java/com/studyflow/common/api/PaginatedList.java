package com.studyflow.common.api;

import java.util.Collections;
import java.util.List;

/**
 * Standard paginated response structure matching docs/api-plan.md Section 1.
 *
 * Contract:
 * - items: List of payload elements
 * - page: 0-indexed or 1-indexed page number
 * - size: Number of items requested per page
 * - totalItems: Total count of items matching the query
 * - totalPages: Total number of pages available
 */
public class PaginatedList<T> {

    private List<T> items;
    private int page;
    private int size;
    private long totalItems;
    private int totalPages;

    public PaginatedList() {
    }

    public PaginatedList(List<T> items, int page, int size, long totalItems, int totalPages) {
        this.items = items;
        this.page = page;
        this.size = size;
        this.totalItems = totalItems;
        this.totalPages = totalPages;
    }

    public static <T> PaginatedList<T> of(List<T> items, int page, int size, long totalItems) {
        int totalPages = size > 0 ? (int) Math.ceil((double) totalItems / size) : 0;
        return new PaginatedList<>(
                items != null ? items : Collections.emptyList(),
                page,
                size,
                totalItems,
                totalPages
        );
    }

    public static <T> Builder<T> builder() {
        return new Builder<>();
    }

    public List<T> getItems() {
        return items;
    }

    public void setItems(List<T> items) {
        this.items = items;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public long getTotalItems() {
        return totalItems;
    }

    public void setTotalItems(long totalItems) {
        this.totalItems = totalItems;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }

    public static class Builder<T> {
        private List<T> items;
        private int page;
        private int size;
        private long totalItems;
        private int totalPages;

        public Builder<T> items(List<T> items) {
            this.items = items;
            return this;
        }

        public Builder<T> page(int page) {
            this.page = page;
            return this;
        }

        public Builder<T> size(int size) {
            this.size = size;
            return this;
        }

        public Builder<T> totalItems(long totalItems) {
            this.totalItems = totalItems;
            return this;
        }

        public Builder<T> totalPages(int totalPages) {
            this.totalPages = totalPages;
            return this;
        }

        public PaginatedList<T> build() {
            return new PaginatedList<>(items, page, size, totalItems, totalPages);
        }
    }
}
