import Pagination from './Pagination';

export default {
  title: 'Common/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  argTypes: {
    currentPage: {
      control: 'number',
      description: 'Trang hiện tại (1-based)',
    },
    totalPages: {
      control: 'number',
      description: 'Tổng số trang',
    },
    totalItems: {
      control: 'number',
      description: 'Tổng số bản ghi',
    },
    itemsPerPage: {
      control: 'number',
      description: 'Số bản ghi trên 1 trang',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md'],
      description: 'Kích cỡ giao diện phân trang',
    },
    onPageChange: { action: 'pageChanged' },
    onItemsPerPageChange: { action: 'itemsPerPageChanged' },
  },
};

export const Default = {
  args: {
    currentPage: 2,
    totalPages: 10,
    totalItems: 98,
    itemsPerPage: 10,
    size: 'md',
  },
};

export const Small = {
  args: {
    currentPage: 1,
    totalPages: 5,
    totalItems: 45,
    itemsPerPage: 10,
    size: 'sm',
  },
};

export const SinglePage = {
  args: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 4,
    itemsPerPage: 10,
  },
};
