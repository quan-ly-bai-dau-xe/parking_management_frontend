import { useMemo } from "react";

export default function usePagination(
    list,
    currentPage,
    itemsPerPage
) {
    const totalPages = Math.max(
        1,
        Math.ceil(list.length / itemsPerPage)
    );

    const paginatedList = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return list.slice(start, start + itemsPerPage);
    }, [list, currentPage, itemsPerPage]);

    return { totalPages, paginatedList };
}