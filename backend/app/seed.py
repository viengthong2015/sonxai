"""Create tables, seed the initial site content (taken from the original index.html),
create the first administrator and publish version 1.

Usage (from the backend folder):
    python -m app.seed                 # safe: only fills an empty database
    python -m app.seed --reset-content # wipes menus/blocks/settings and re-seeds them
"""

import argparse
import secrets
import sys

from sqlalchemy import func, select

from . import models  # noqa: F401
from .database import Base, SessionLocal, engine
from .models import Block, Menu, Publication, User
from .config import settings
from .security import hash_password
from .services import DEFAULT_SETTINGS, build_snapshot, get_settings_row


def L(en: str, lo: str = "") -> dict[str, str]:
    return {"en": en, "lo": lo}


APPLY = {"action": "apply", "url": ""}

PAGES: list[dict] = [
    {
        "slug": "home",
        "label": L("Home", "ໜ້າຫຼັກ"),
        "is_home": True,
        "blocks": [
            ("hero", {
                "eyebrow": L("Sonxai Primary School", "ໂຮງຮຽນປະຖົມ ສອນໄຊ"),
                "headline": L("Where every child learns, grows and shines",
                              "ບ່ອນທີ່ເດັກນ້ອຍທຸກຄົນໄດ້ຮຽນຮູ້, ເຕີບໃຫຍ່ ແລະ ໂດດເດັ່ນ"),
                "subtitle": L(
                    "A caring primary school offering a strong academic foundation, creative arts, sports and a safe, joyful place to learn.",
                    "ໂຮງຮຽນປະຖົມທີ່ເອົາໃຈໃສ່ ສ່ງເສີມພື້ນຖານວິຊາການທີ່ເຂັ້ມແຂງ, ສິລະປະສ້າງສັນ, ກິລາ ແລະ ສະພາບແວດລ້ອມທີ່ປອດໄພ."),
                "primary_label": L("Apply now", "ສະໝັກຮຽນດ່ວນ"),
                "primary_action": "apply",
                "primary_url": "",
                "secondary_label": L("Explore programs", "ຄົ້ນຫາຫຼັກສູດ"),
                "secondary_url": "/services",
                "badges": [
                    {"icon": "fa-solid fa-shield-halved", "color": "amber", "text": L("Certified Curriculum", "ຫຼັກສູດທີ່ໄດ້ຮັບການຮັບຮອງ")},
                    {"icon": "fa-solid fa-heart", "color": "rose", "text": L("Caring Environment", "ສະພາບແວດລ້ອມທີ່ເອົາໃຈໃສ່")},
                    {"icon": "fa-solid fa-award", "color": "teal", "text": L("Awarded Excellence", "ໄດ້ຮັບລາງວັນຄວາມເປັນເລີດ")},
                ],
                "show_graphic": True,
                "bubbles": [
                    {"text": "ກ ຂ ຄ", "icon": "", "caption": L("Lao Arts", "ພາສາລາວ")},
                    {"text": "A B C", "icon": "", "caption": L("English", "ພາສາອັງກິດ")},
                    {"text": "1 + 2", "icon": "", "caption": L("Mathematics", "ຄະນິດສາດ")},
                    {"text": "", "icon": "fa-solid fa-seedling", "caption": L("Growth", "ການເຕີບໂຕ")},
                ],
            }),
            ("stats", {
                "overlap": True,
                "items": [
                    {"icon": "fa-solid fa-face-smile", "color": "brand", "value": "450", "suffix": "+", "label": L("Happy students", "ນັກຮຽນທີ່ມີຄວາມສຸກ")},
                    {"icon": "fa-solid fa-chalkboard-user", "color": "teal", "value": "32", "suffix": "+", "label": L("Qualified teachers", "ຄູສອນທີ່ມີຄຸນວຸດທິ")},
                    {"icon": "fa-solid fa-users", "color": "amber", "value": "20:1", "suffix": "", "label": L("Student–teacher ratio", "ອັດຕາສ່ວນ ຄູ : ນັກຮຽນ")},
                    {"icon": "fa-solid fa-trophy", "color": "emerald", "value": "15", "suffix": "+", "label": L("Years of excellence", "ປີ ແຫ່ງຄວາມເປັນເລີດ")},
                ],
            }),
            ("cards", {
                "eyebrow": L("Our Core Pillars", "ເສົາຫຼັກຂອງພວກເຮົາ"),
                "title": L("Holistic Primary Education", "ການສຶກສາປະຖົມແບບຮອບດ້ານ"),
                "subtitle": L(
                    "We balance rigorous academic fundamentals with creative arts, physical health, and emotional well-being.",
                    "ພວກເຮົາສົມທົບພື້ນຖານວິຊາການທີ່ເຂັ້ມແຂງ ກັບສິລະປະສ້າງສັນ, ສຸຂະພາບກາຍ ແລະ ສຸຂະພາບຈິດ."),
                "columns": "3",
                "background": "slate",
                "items": [
                    {"icon": "fa-solid fa-book-open", "color": "brand",
                     "title": L("Academic Foundation", "ພື້ນຖານວິຊາການ"),
                     "text": L("Comprehensive curriculum in Literacy, Mathematics, Science, and Lao Cultural Heritage designed for young minds.",
                               "ຫຼັກສູດຄົບຖ້ວນດ້ານການອ່ານຂຽນ, ຄະນິດສາດ, ວິທະຍາສາດ ແລະ ມໍລະດົກວັດທະນະທຳລາວ ສຳລັບເດັກນ້ອຍ."),
                     "link_label": L("Learn More", "ອ່ານເພີ່ມເຕີມ"), "link_action": "link", "link_url": "/services"},
                    {"icon": "fa-solid fa-palette", "color": "amber",
                     "title": L("Creative Arts & Music", "ສິລະປະສ້າງສັນ ແລະ ດົນຕີ"),
                     "text": L("Unlocking imagination through visual arts, traditional Lao instruments, drama, and self-expression studios.",
                               "ປົດປ່ອຍຈິນຕະນາການຜ່ານສິລະປະ, ເຄື່ອງດົນຕີພື້ນເມືອງລາວ, ການສະແດງ ແລະ ການສະແດງອອກ."),
                     "link_label": L("Learn More", "ອ່ານເພີ່ມເຕີມ"), "link_action": "link", "link_url": "/services"},
                    {"icon": "fa-solid fa-futbol", "color": "teal",
                     "title": L("Sports & Health", "ກິລາ ແລະ ສຸຂະພາບ"),
                     "text": L("Fostering teamwork, motor skills, and wellness through structured physical activity, games, and outdoor sports.",
                               "ສົ່ງເສີມການເຮັດວຽກເປັນທີມ, ທັກສະການເຄື່ອນໄຫວ ແລະ ສຸຂະພາບທີ່ດີ ຜ່ານກິດຈະກຳທາງກາຍ ແລະ ກິລາກາງແຈ້ງ."),
                     "link_label": L("Learn More", "ອ່ານເພີ່ມເຕີມ"), "link_action": "link", "link_url": "/services"},
                ],
            }),
            ("cta", {
                "title": L("Ready to join the Sonxai Family?", "ພ້ອມເຂົ້າຮ່ວມຄອບຄົວສອນໄຊແລ້ວບໍ?"),
                "subtitle": L("Enrollment for the upcoming academic year is now open. Seats are limited!",
                              "ເປີດຮັບສະໝັກນັກຮຽນສຳລັບສົກຮຽນໃໝ່ແລ້ວ. ບ່ອນນັ່ງມີຈຳນວນຈຳກັດ!"),
                "button_label": L("Start Admissions Application", "ເລີ່ມສະໝັກເຂົ້າຮຽນ"),
                "button_action": "apply",
                "button_url": "",
                "style": "dark",
            }),
        ],
    },
    {
        "slug": "services",
        "label": L("Services & Programs", "ບໍລິການ ແລະ ຫຼັກສູດ"),
        "blocks": [
            ("page_header", {
                "eyebrow": L("Services & Programs", "ບໍລິການ ແລະ ຫຼັກສູດ"),
                "title": L("Programs for every stage of primary learning", "ຫຼັກສູດສຳລັບທຸກຂັ້ນຕອນຂອງການຮຽນຊັ້ນປະຖົມ"),
                "subtitle": L("From kindergarten preparation to Grade 5, we nurture curious, confident and kind learners.",
                              "ຕັ້ງແຕ່ກຽມອະນຸບານ ຮອດ ປ.5, ພວກເຮົາບົ່ມສ້າງນັກຮຽນທີ່ຢາກຮູ້ຢາກເຫັນ, ມີຄວາມໝັ້ນໃຈ ແລະ ມີນ້ຳໃຈ."),
            }),
            ("cards", {
                "eyebrow": L("What we offer", "ສິ່ງທີ່ພວກເຮົາມອບໃຫ້"),
                "title": L("Our programs", "ຫຼັກສູດຂອງພວກເຮົາ"),
                "subtitle": L("", ""),
                "columns": "3",
                "background": "slate",
                "items": [
                    {"icon": "fa-solid fa-book-open", "color": "brand", "title": L("Academic Foundation", "ພື້ນຖານວິຊາການ"),
                     "text": L("Literacy, Mathematics, Science and Lao Cultural Heritage taught in small, attentive classes.",
                               "ການອ່ານຂຽນ, ຄະນິດສາດ, ວິທະຍາສາດ ແລະ ມໍລະດົກວັດທະນະທຳລາວ ໃນຫ້ອງຮຽນຂະໜາດນ້ອຍ."),
                     "link_label": L("", ""), "link_action": "none", "link_url": ""},
                    {"icon": "fa-solid fa-language", "color": "sky", "title": L("Bilingual Literacy", "ການອ່ານຂຽນສອງພາສາ"),
                     "text": L("Strong reading and writing skills in both Lao and English from the very first grade.",
                               "ທັກສະການອ່ານ ແລະ ຂຽນທີ່ເຂັ້ມແຂງ ທັງພາສາລາວ ແລະ ພາສາອັງກິດ ຕັ້ງແຕ່ຊັ້ນທຳອິດ."),
                     "link_label": L("", ""), "link_action": "none", "link_url": ""},
                    {"icon": "fa-solid fa-palette", "color": "amber", "title": L("Creative Arts & Music", "ສິລະປະສ້າງສັນ ແລະ ດົນຕີ"),
                     "text": L("Visual arts, traditional Lao instruments, drama and self-expression studios.",
                               "ສິລະປະ, ເຄື່ອງດົນຕີພື້ນເມືອງລາວ, ການສະແດງ ແລະ ການສະແດງອອກ."),
                     "link_label": L("", ""), "link_action": "none", "link_url": ""},
                    {"icon": "fa-solid fa-futbol", "color": "teal", "title": L("Sports & Health", "ກິລາ ແລະ ສຸຂະພາບ"),
                     "text": L("Daily physical activity, team games and outdoor sports for healthy growth.",
                               "ກິດຈະກຳທາງກາຍປະຈຳວັນ, ເກມເປັນທີມ ແລະ ກິລາກາງແຈ້ງ ເພື່ອການເຕີບໃຫຍ່ທີ່ແຂງແຮງ."),
                     "link_label": L("", ""), "link_action": "none", "link_url": ""},
                    {"icon": "fa-solid fa-book", "color": "violet", "title": L("Library & Reading", "ຫ້ອງສະໝຸດ ແລະ ການອ່ານ"),
                     "text": L("A welcoming library with reading sessions that build a lifelong love of books.",
                               "ຫ້ອງສະໝຸດທີ່ອົບອຸ່ນ ພ້ອມກິດຈະກຳການອ່ານ ເພື່ອສ້າງນິໄສຮັກການອ່ານ."),
                     "link_label": L("", ""), "link_action": "none", "link_url": ""},
                    {"icon": "fa-solid fa-sun", "color": "rose", "title": L("After-school Care", "ການດູແລຫຼັງເລີກຮຽນ"),
                     "text": L("Supervised homework time and activities until parents arrive.",
                               "ເວລາເຮັດວຽກບ້ານ ແລະ ກິດຈະກຳພາຍໃຕ້ການເບິ່ງແຍງ ຈົນກວ່າຜູ້ປົກຄອງມາຮັບ."),
                     "link_label": L("", ""), "link_action": "none", "link_url": ""},
                ],
            }),
            ("cta", {
                "title": L("Find the right program for your child", "ຊອກຫາຫຼັກສູດທີ່ເໝາະສົມສຳລັບລູກຂອງທ່ານ"),
                "subtitle": L("Our team is happy to answer your questions.", "ທີມງານຂອງພວກເຮົາຍິນດີຕອບທຸກຄຳຖາມ."),
                "button_label": L("Apply now", "ສະໝັກຮຽນດ່ວນ"),
                "button_action": "apply", "button_url": "", "style": "brand",
            }),
        ],
    },
    {
        "slug": "about",
        "label": L("About Us", "ກ່ຽວກັບພວກເຮົາ"),
        "blocks": [
            ("page_header", {
                "eyebrow": L("About Us", "ກ່ຽວກັບພວກເຮົາ"),
                "title": L("A caring community of learners", "ຊຸມຊົນແຫ່ງການຮຽນຮູ້ທີ່ເອົາໃຈໃສ່"),
                "subtitle": L("For more than 15 years, Sonxai Primary School has helped children grow in knowledge and character.",
                              "ຫຼາຍກວ່າ 15 ປີ, ໂຮງຮຽນປະຖົມ ສອນໄຊ ໄດ້ຊ່ວຍໃຫ້ເດັກນ້ອຍເຕີບໃຫຍ່ທັງດ້ານຄວາມຮູ້ ແລະ ບຸກຄະລິກກະພາບ."),
            }),
            ("image_text", {
                "eyebrow": L("Our mission", "ພາລະກິດຂອງພວກເຮົາ"),
                "title": L("Every child learns, grows and shines", "ເດັກທຸກຄົນໄດ້ຮຽນຮູ້, ເຕີບໃຫຍ່ ແລະ ໂດດເດັ່ນ"),
                "html": L(
                    "<p>We provide a safe, joyful environment where children build a strong academic foundation while discovering their creativity, health and kindness.</p><p>Our teachers work closely with families so that every child is known, supported and challenged.</p>",
                    "<p>ພວກເຮົາສ້າງສະພາບແວດລ້ອມທີ່ປອດໄພ ແລະ ມ່ວນຊື່ນ ບ່ອນທີ່ເດັກນ້ອຍສ້າງພື້ນຖານວິຊາການທີ່ເຂັ້ມແຂງ ພ້ອມທັງຄົ້ນພົບຄວາມຄິດສ້າງສັນ, ສຸຂະພາບ ແລະ ຄວາມມີນ້ຳໃຈ.</p><p>ຄູຂອງພວກເຮົາເຮັດວຽກຢ່າງໃກ້ຊິດກັບຄອບຄົວ ເພື່ອໃຫ້ເດັກທຸກຄົນໄດ້ຮັບການເອົາໃຈໃສ່ ແລະ ສະໜັບສະໜູນ.</p>"),
                "image_url": "",
                "image_alt": L("", ""),
                "image_icon": "fa-solid fa-school",
                "image_position": "right",
                "button_label": L("", ""), "button_action": "none", "button_url": "",
            }),
            ("rich_text", {
                "eyebrow": L("Our values", "ຄຸນຄ່າຂອງພວກເຮົາ"),
                "title": L("What guides us", "ສິ່ງທີ່ນຳພາພວກເຮົາ"),
                "html": L(
                    "<ul><li><strong>Care</strong> — every child is safe, respected and loved.</li><li><strong>Curiosity</strong> — we encourage questions and discovery.</li><li><strong>Culture</strong> — we celebrate Lao language and heritage.</li><li><strong>Community</strong> — families and teachers learn together.</li></ul>",
                    "<ul><li><strong>ຄວາມເອົາໃຈໃສ່</strong> — ເດັກທຸກຄົນປອດໄພ, ໄດ້ຮັບຄວາມເຄົາລົບ ແລະ ຄວາມຮັກ.</li><li><strong>ຄວາມຢາກຮູ້</strong> — ພວກເຮົາສົ່ງເສີມການຕັ້ງຄຳຖາມ ແລະ ການຄົ້ນພົບ.</li><li><strong>ວັດທະນະທຳ</strong> — ພວກເຮົາເຊີດຊູພາສາ ແລະ ມໍລະດົກລາວ.</li><li><strong>ຊຸມຊົນ</strong> — ຄອບຄົວ ແລະ ຄູຮຽນຮູ້ໄປພ້ອມກັນ.</li></ul>"),
                "width": "narrow",
                "background": "slate",
            }),
            ("stats", {
                "overlap": False,
                "items": [
                    {"icon": "fa-solid fa-face-smile", "color": "brand", "value": "450", "suffix": "+", "label": L("Happy students", "ນັກຮຽນທີ່ມີຄວາມສຸກ")},
                    {"icon": "fa-solid fa-chalkboard-user", "color": "teal", "value": "32", "suffix": "+", "label": L("Qualified teachers", "ຄູສອນທີ່ມີຄຸນວຸດທິ")},
                    {"icon": "fa-solid fa-users", "color": "amber", "value": "20:1", "suffix": "", "label": L("Student–teacher ratio", "ອັດຕາສ່ວນ ຄູ : ນັກຮຽນ")},
                    {"icon": "fa-solid fa-trophy", "color": "emerald", "value": "15", "suffix": "+", "label": L("Years of excellence", "ປີ ແຫ່ງຄວາມເປັນເລີດ")},
                ],
            }),
        ],
    },
    {
        "slug": "partners",
        "label": L("Partners", "ຄູ່ຮ່ວມງານ"),
        "blocks": [
            ("page_header", {
                "eyebrow": L("Partners", "ຄູ່ຮ່ວມງານ"),
                "title": L("Stronger together", "ເຂັ້ມແຂງໄປພ້ອມກັນ"),
                "subtitle": L("We work with families and organisations who share our commitment to children.",
                              "ພວກເຮົາຮ່ວມມືກັບຄອບຄົວ ແລະ ອົງການຕ່າງໆ ທີ່ມີຄວາມມຸ່ງໝັ້ນຕໍ່ເດັກນ້ອຍຄືກັນ."),
            }),
            ("partners", {
                "eyebrow": L("", ""),
                "title": L("Our partners", "ຄູ່ຮ່ວມງານຂອງພວກເຮົາ"),
                "subtitle": L("Replace these examples with your real partners in the admin panel.",
                              "ປ່ຽນຕົວຢ່າງເຫຼົ່ານີ້ເປັນຄູ່ຮ່ວມງານຕົວຈິງໃນແຜງຄວບຄຸມ."),
                "items": [
                    {"name": L("Parent–Teacher Association", "ສະມາຄົມພໍ່ແມ່ ແລະ ຄູ"), "description": L("Families and teachers working together.", "ຄອບຄົວ ແລະ ຄູເຮັດວຽກຮ່ວມກັນ."), "icon": "fa-solid fa-people-roof", "logo_url": "", "url": ""},
                    {"name": L("District Education Office", "ຫ້ອງການສຶກສາເມືອງ"), "description": L("Curriculum guidance and support.", "ການແນະນຳ ແລະ ສະໜັບສະໜູນຫຼັກສູດ."), "icon": "fa-solid fa-building-columns", "logo_url": "", "url": ""},
                    {"name": L("Community Library", "ຫ້ອງສະໝຸດຊຸມຊົນ"), "description": L("Books and reading programs.", "ປຶ້ມ ແລະ ກິດຈະກຳການອ່ານ."), "icon": "fa-solid fa-book-open-reader", "logo_url": "", "url": ""},
                    {"name": L("Local Health Center", "ສູນສຸຂະພາບທ້ອງຖິ່ນ"), "description": L("Health checks and wellbeing.", "ການກວດສຸຂະພາບ ແລະ ສະຫວັດດີການ."), "icon": "fa-solid fa-heart-pulse", "logo_url": "", "url": ""},
                ],
            }),
        ],
    },
    {
        "slug": "enrollment",
        "label": L("Enrollment", "ການລົງທະບຽນ"),
        "blocks": [
            ("page_header", {
                "eyebrow": L("Enrollment", "ການລົງທະບຽນ"),
                "title": L("Join the Sonxai family", "ເຂົ້າຮ່ວມຄອບຄົວສອນໄຊ"),
                "subtitle": L("Enrollment for the upcoming academic year is now open. Seats are limited!",
                              "ເປີດຮັບສະໝັກນັກຮຽນສຳລັບສົກຮຽນໃໝ່ແລ້ວ. ບ່ອນນັ່ງມີຈຳນວນຈຳກັດ!"),
            }),
            ("rich_text", {
                "eyebrow": L("", ""),
                "title": L("How to enroll", "ວິທີການລົງທະບຽນ"),
                "html": L(
                    "<ol><li>Send us the request form below.</li><li>Our admissions team will call you to arrange a school visit.</li><li>Bring your child's birth certificate and previous school report.</li><li>Complete registration and welcome to Sonxai!</li></ol>",
                    "<ol><li>ສົ່ງແບບຟອມຄຳຮ້ອງລຸ່ມນີ້ໃຫ້ພວກເຮົາ.</li><li>ທີມງານຮັບສະໝັກຈະໂທຫາທ່ານ ເພື່ອນັດຢ້ຽມຊົມໂຮງຮຽນ.</li><li>ນຳເອົາໃບແຈ້ງເກີດ ແລະ ໃບຄະແນນຂອງໂຮງຮຽນເກົ່າ.</li><li>ສຳເລັດການລົງທະບຽນ ແລະ ຍິນດີຕ້ອນຮັບສູ່ສອນໄຊ!</li></ol>"),
                "width": "narrow",
                "background": "white",
            }),
            ("enrollment_form", {
                "title": L("Request an enrollment pack", "ຂໍຮັບເອກະສານການລົງທະບຽນ"),
                "subtitle": L("We will contact you within two working days.", "ພວກເຮົາຈະຕິດຕໍ່ທ່ານພາຍໃນສອງວັນລັດຖະການ."),
            }),
        ],
    },
]


def seed_content(db) -> None:
    for i, page in enumerate(PAGES):
        menu = Menu(
            slug=page["slug"],
            label=page["label"],
            menu_type="page",
            is_home=page.get("is_home", False),
            is_visible=True,
            show_in_nav=True,
            sort_order=i,
            meta_description={},
        )
        menu.blocks = [
            Block(block_type=t, data=d, is_visible=True, sort_order=j)
            for j, (t, d) in enumerate(page["blocks"])
        ]
        db.add(menu)
    get_settings_row(db).data = dict(DEFAULT_SETTINGS)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset-content", action="store_true", help="Delete menus/blocks/settings and re-seed them.")
    args = parser.parse_args()

    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if args.reset_content:
            db.execute(Block.__table__.delete())
            db.execute(Menu.__table__.delete())
            db.flush()

        seeded = False
        if (db.scalar(select(func.count(Menu.id))) or 0) == 0:
            seed_content(db)
            db.flush()
            seeded = True
            print(f"Seeded {len(PAGES)} pages from the original design.")
        else:
            print("Menus already exist - content left unchanged (use --reset-content to re-seed).")

        admin = None
        if (db.scalar(select(func.count(User.id))) or 0) == 0:
            password = settings.initial_admin_password or secrets.token_urlsafe(12)
            admin = User(
                username=settings.initial_admin_username,
                full_name="Administrator",
                password_hash=hash_password(password),
            )
            db.add(admin)
            db.flush()
            print(f"Created administrator '{admin.username}'.")
            if not settings.initial_admin_password:
                print(f"  Generated password: {password}  (change it after first login)")

        if seeded or db.scalar(select(func.count(Publication.id))) == 0:
            publisher = admin or db.scalars(select(User).order_by(User.id)).first()
            db.add(Publication(
                snapshot=build_snapshot(db),
                note="Initial content" if seeded else "Initial publish",
                published_by_id=publisher.id if publisher else None,
            ))
            print("Published the site.")

        db.commit()
    return 0


if __name__ == "__main__":
    sys.exit(main())
