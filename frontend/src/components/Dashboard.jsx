import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dashboard() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  
  const [formData, setFormData] = useState({ id: null, category: 'Drinks', name: '', description: '', price: '', image: null });
  const navigate = useNavigate();

  const cafeName = localStorage.getItem('cafeName');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get('/api/dashboard/items', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setItems(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('cafeName');
    navigate('/login');
  };

  const openQrModal = async () => {
    try {
      const res = await axios.get('/api/dashboard/qr', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setQrData(res.data);
      setShowQrModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('category', formData.category);
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('price', formData.price);
    if (formData.image) data.append('image', formData.image);

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' };
      if (formData.id) {
        await axios.put(`/api/dashboard/items/${formData.id}`, data, { headers });
      } else {
        await axios.post('/api/dashboard/items', data, { headers });
      }
      setShowModal(false);
      setFormData({ id: null, category: 'Drinks', name: '', description: '', price: '', image: null });
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (item) => {
    setFormData({ id: item.id, category: item.category, name: item.name, description: item.description, price: item.price, image: null });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axios.delete(`/api/dashboard/items/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard - {cafeName}</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={openQrModal}>View QR & Menu</button>
          <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <button className="btn" style={{ width: 'auto' }} onClick={() => {
          setFormData({ id: null, category: 'Drinks', name: '', description: '', price: '', image: null });
          setShowModal(true);
        }}>+ Add New Item</button>
      </div>

      <div className="card-grid">
        {items.map(item => (
          <div key={item.id} className="card">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="card-img" />
            ) : (
              <div className="card-img">No Image</div>
            )}
            <div className="card-content">
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{item.category}</div>
              <div className="card-title">{item.name}</div>
              <div className="card-price">{item.price} ₸</div>
              <div className="card-desc">{item.description}</div>
              <div className="card-actions">
                <button className="btn btn-secondary" onClick={() => handleEdit(item)}>Edit</button>
                <button className="btn btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{formData.id ? 'Edit Item' : 'Add Item'}</h3>
            <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
              <div className="input-group">
                <label>Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option>Drinks</option>
                  <option>Food</option>
                  <option>Desserts</option>
                </select>
              </div>
              <div className="input-group">
                <label>Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required></textarea>
              </div>
              <div className="input-group">
                <label>Price</label>
                <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Image</label>
                <input type="file" accept="image/*" onChange={e => setFormData({...formData, image: e.target.files[0]})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn">Save</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQrModal && qrData && (
        <div className="modal-overlay">
          <div className="modal" style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Your Public Menu</h3>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.5rem' }}>
              <img src={qrData.qrCode} alt="QR Code" style={{ width: '200px', height: '200px' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <a href={qrData.url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{qrData.url}</a>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href={qrData.qrCode} download="menu-qr.png" className="btn" style={{ textAlign: 'center', lineHeight: '1.5', textDecoration: 'none' }}>Download QR</a>
              <button className="btn btn-secondary" onClick={() => setShowQrModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
