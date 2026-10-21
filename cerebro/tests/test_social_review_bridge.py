import unittest
from cerebro.communication.social_review_bridge import social_subject, classify_reply, extract_unquoted_reply_text

class SocialReviewBridgeTest(unittest.TestCase):
    def test_subjects(self):
        self.assertTrue(social_subject('Re: CEREBRO · Revisión de publicación · LinkedIn · 23 de octubre'))
        self.assertTrue(social_subject('CEREBRO · Revisión de publicación · Instagram'))
        self.assertFalse(social_subject('CEREBRO · 2 AUTORIZACIONES PENDIENTES'))

    def test_natural_ok(self):
        for value in ['OK', 'ok.', 'Perfecta', 'PUBLICALA', 'Publícala']:
            self.assertEqual(classify_reply(value), 'OK')

    def test_any_nonempty_non_ok_is_correction(self):
        self.assertEqual(classify_reply('NO OK EL TEXTO NARANJA NO SE VE BIEN'), 'CORRECTION')
        self.assertEqual(classify_reply('haz el logo un poco más pequeño'), 'CORRECTION')

    def test_quoted_original_is_removed(self):
        raw='NO OK: aumenta el grosor\n\nEl mié, 21 oct 2026 escribió:\n> texto anterior'
        self.assertEqual(extract_unquoted_reply_text(raw), 'NO OK: aumenta el grosor')

if __name__ == '__main__':
    unittest.main()
