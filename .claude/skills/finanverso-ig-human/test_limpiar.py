import io
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(__file__))
import limpiar


class TestLimpiar(unittest.TestCase):
    def test_invisibles_y_espacios(self):
        t, inf = limpiar.limpiar("Hola​ mundo hoy⁠ 👨‍👩")
        self.assertEqual(t, "Hola mundo hoy 👨‍👩")
        self.assertTrue(any("invisibles" in i for i in inf))
        self.assertTrue(any("espacios raros" in i for i in inf))

    def test_muletillas(self):
        t, inf = limpiar.limpiar("Sin más dilación, mira. Descubre cómo ahorrar en el mundo actual.")
        self.assertNotIn("dilación", t)
        self.assertIn("mira cómo ahorrar", t)
        self.assertIn("hoy", t)
        self.assertTrue(any("quitada" in i for i in inf))

    def test_revisar_a_mano(self):
        _, inf = limpiar.limpiar("No solo ahorras, sino también aprendes — es perfecto")
        self.assertEqual(sum(1 for i in inf if i.startswith("REVISAR")), 3)

    def test_limpio(self):
        t, inf = limpiar.limpiar("Apunta un gasto  en 3 toques .")
        self.assertEqual(t, "Apunta un gasto en 3 toques.")
        self.assertEqual(inf, [])

    def test_main(self):
        out, err = io.StringIO(), io.StringIO()
        with mock.patch("sys.stdin", io.StringIO("Hola​")), mock.patch("sys.stdout", out), mock.patch("sys.stderr", err):
            self.assertEqual(limpiar.main(), 0)
        self.assertEqual(out.getvalue(), "Hola\n")
        self.assertIn("invisibles", err.getvalue())


if __name__ == "__main__":
    unittest.main()
