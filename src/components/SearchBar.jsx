import React from 'react';

const SearchBar = ({ value, onChange, onSearch }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="mb-3">
      <div className="input-group">
        <input
          type="text"
          className="form-control"
          placeholder="Tìm theo tên, email, số điện thoại..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button className="btn btn-outline-secondary" type="submit">
          Tìm kiếm
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
