import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function PublicMenu() {
  const { cafeName } = useParams();
  const [cafe, setCafe] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await axios.get(`/api/menu/${cafeName}`);
        setCafe(res.data.cafe);
        setItems(res.data.items);
      } catch (err) {
        setError('Menu not found');
      }
    };
    fetchMenu();
  }, [cafeName]);

  if (error) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}><h2>{error}</h2></div>;
  }

  if (!cafe) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading...</div>;
  }

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="menu-container">
      <div className="menu-header">
        <h1>{cafe} Menu</h1>
        <p style={{ color: '#94a3b8' }}>Welcome! Browse our delicious offerings below.</p>
      </div>

      {Object.keys(groupedItems).map(category => (
        <div key={category} className="category-section">
          <h2 className="category-title">{category}</h2>
          <div className="card-grid">
            {groupedItems[category].map(item => (
              <div key={item.id} className="card">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="card-img" />
                ) : (
                  <div className="card-img">No Image</div>
                )}
                <div className="card-content">
                  <div className="card-title">{item.name}</div>
                  <div className="card-price">${item.price}</div>
                  <div className="card-desc">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {items.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          This menu is currently empty.
        </div>
      )}
    </div>
  );
}

export default PublicMenu;
