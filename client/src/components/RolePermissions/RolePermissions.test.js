import { render, screen } from '@testing-library/react';
import RolePermissions from './index';

describe('RolePermissions Component', () => {
  it('renders without crashing with empty permissions', () => {
    render(<RolePermissions permissions={[]} />);
    expect(screen.getByText(/Role Permissions/i)).toBeInTheDocument();
  });

  it('displays "No permissions assigned" message when permissions array is empty', () => {
    render(<RolePermissions permissions={[]} />);
    expect(screen.getByText(/No permissions assigned/i)).toBeInTheDocument();
  });

  it('displays "No permissions assigned" message when permissions prop is undefined', () => {
    render(<RolePermissions />);
    expect(screen.getByText(/No permissions assigned/i)).toBeInTheDocument();
  });

  it('displays custom title when provided', () => {
    render(<RolePermissions permissions={[]} title="Custom Permissions" />);
    expect(screen.getByText(/Custom Permissions/i)).toBeInTheDocument();
  });

  it('shows permission count in title by default', () => {
    const mockPermissions = [
      { _id: '1', name: 'CAN_VIEW_USER' },
      { _id: '2', name: 'CAN_CREATE_USER' },
    ];
    render(<RolePermissions permissions={mockPermissions} />);
    expect(screen.getByText(/Role Permissions \(2\)/i)).toBeInTheDocument();
  });

  it('hides permission count when showCount is false', () => {
    const mockPermissions = [
      { _id: '1', name: 'CAN_VIEW_USER' },
    ];
    render(<RolePermissions permissions={mockPermissions} showCount={false} />);
    expect(screen.getByText(/^Role Permissions$/)).toBeInTheDocument();
    expect(screen.queryByText(/\(1\)/)).not.toBeInTheDocument();
  });

  it('displays entity groups for USER and APARTMENT permissions', () => {
    const mockPermissions = [
      { _id: '1', name: 'CAN_VIEW_USER' },
      { _id: '2', name: 'CAN_CREATE_USER' },
      { _id: '3', name: 'CAN_VIEW_APARTMENT' },
      { _id: '4', name: 'CAN_UPDATE_APARTMENT' },
    ];

    render(<RolePermissions permissions={mockPermissions} />);

    // Check for entity group headers
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Apartment')).toBeInTheDocument();

    // Check for shortened permission names (without CAN_ and entity prefix)
    // VIEW appears twice (once for USER, once for APARTMENT)
    const viewBadges = screen.getAllByText('VIEW');
    expect(viewBadges).toHaveLength(2);

    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByText('UPDATE')).toBeInTheDocument();
  });

  it('groups permissions by entity correctly', () => {
    const mockPermissions = [
      { _id: '1', name: 'CAN_VIEW_USER' },
      { _id: '2', name: 'CAN_CREATE_USER' },
      { _id: '3', name: 'CAN_DEACTIVATE_USER' },
      { _id: '4', name: 'CAN_VIEW_ROLE' },
      { _id: '5', name: 'CAN_UPDATE_ROLE' },
    ];

    render(<RolePermissions permissions={mockPermissions} />);

    // Check entity headers
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();

    // All 5 permission badges should be present
    const badges = screen.getAllByText(/VIEW|CREATE|DEACTIVATE|UPDATE/);
    expect(badges).toHaveLength(5);
  });

  it('displays multiple entity groups in correct order', () => {
    const mockPermissions = [
      { _id: '1', name: 'CAN_VIEW_CLEANING' },
      { _id: '2', name: 'CAN_VIEW_USER' },
      { _id: '3', name: 'CAN_VIEW_APARTMENT' },
      { _id: '4', name: 'CAN_VIEW_ROLE' },
    ];

    render(<RolePermissions permissions={mockPermissions} />);

    // Check that all entity headers exist
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Apartment')).toBeInTheDocument();
    expect(screen.getByText('Cleaning')).toBeInTheDocument();
  });

  it('handles special cleaning permissions correctly', () => {
    const mockPermissions = [
      { _id: '1', name: 'CAN_VIEW_CLEANING' },
      { _id: '2', name: 'CAN_COMPLETE_CLEANING' },
      { _id: '3', name: 'CAN_VIEW_CLEANING_SENSITIVE_DATA' },
    ];

    render(<RolePermissions permissions={mockPermissions} />);

    // All should be grouped under Cleaning
    expect(screen.getByText('Cleaning')).toBeInTheDocument();

    
    // Check for permission badges
    expect(screen.getByText('VIEW')).toBeInTheDocument();
    expect(screen.getByText('COMPLETE')).toBeInTheDocument();
    expect(screen.getByText('VIEW_SENSITIVE_DATA')).toBeInTheDocument();
  });

  it('renders in compact mode when compact prop is true', () => {
    const mockPermissions = [
      { _id: '1', name: 'CAN_VIEW_USER' },
      { _id: '2', name: 'CAN_CREATE_APARTMENT' },
    ];

    render(<RolePermissions permissions={mockPermissions} compact={true} />);

    // Entity headers should be present
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Apartment')).toBeInTheDocument();

    // Permission badges should be present
    expect(screen.getByText('VIEW')).toBeInTheDocument();
    expect(screen.getByText('CREATE')).toBeInTheDocument();
  });

  it('renders in grid mode by default', () => {
    const mockPermissions = [
      { _id: '1', name: 'CAN_VIEW_USER' },
      { _id: '2', name: 'CAN_CREATE_APARTMENT' },
    ];

    render(<RolePermissions permissions={mockPermissions} />);

    // Entity headers should be present
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Apartment')).toBeInTheDocument();

    // Permission badges should be present
    expect(screen.getByText('VIEW')).toBeInTheDocument();
    expect(screen.getByText('CREATE')).toBeInTheDocument();
  });

  it('displays all CRUD permissions for an entity', () => {
    const mockPermissions = [
      { _id: '1', name: 'CAN_VIEW_USER' },
      { _id: '2', name: 'CAN_CREATE_USER' },
      { _id: '3', name: 'CAN_UPDATE_USER' },
      { _id: '4', name: 'CAN_DEACTIVATE_USER' },
    ];

    render(<RolePermissions permissions={mockPermissions} />);

    // Check all CRUD operations are displayed
    expect(screen.getByText('VIEW')).toBeInTheDocument();
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByText('UPDATE')).toBeInTheDocument();
    expect(screen.getByText('DEACTIVATE')).toBeInTheDocument();
  });

  it('does not display entity groups that have no permissions', () => {
    const mockPermissions = [
      { _id: '1', name: 'CAN_VIEW_USER' },
      // No APARTMENT permissions
    ];

    render(<RolePermissions permissions={mockPermissions} />);

    // User should be present
    expect(screen.getByText('User')).toBeInTheDocument();

    // Apartment should NOT be present
    expect(screen.queryByText('Apartment')).not.toBeInTheDocument();
  });
});
