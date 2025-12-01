import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import { Link } from "react-router-dom";
import packageJson from "/package.json";

function NavBar() {
  return (
    <Navbar expand="lg" className="bg-body-tertiary">
      <Container>
        <Navbar.Brand as={Link} to="/">
          Sequence Visualizer {packageJson.version}
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/plot">
              Plot
            </Nav.Link>
            <Nav.Link as={Link} to="/hardware">
              Hardware
            </Nav.Link>
            <Nav.Link as={Link} to="/config">
              Configure
            </Nav.Link>
            <NavDropdown title="JSON source" id="collapsible-plot-dropdown">
              <NavDropdown.Item href="/sequencejson">
                Sequence JSON
              </NavDropdown.Item>
              <NavDropdown.Item href="/descriptionjson">
                Hardware description JSON
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavBar;
