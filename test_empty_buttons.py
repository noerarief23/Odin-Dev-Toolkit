from html.parser import HTMLParser

class ButtonParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_button = False
        self.button_text = ""
        self.button_attrs = []
        self.buttons = []
        self.line_num = 0

    def handle_starttag(self, tag, attrs):
        if tag == "button":
            self.in_button = True
            self.button_text = ""
            self.button_attrs = attrs
            self.line_num = self.getpos()[0]

    def handle_data(self, data):
        if self.in_button:
            self.button_text += data

    def handle_endtag(self, tag):
        if tag == "button":
            self.in_button = False
            if not self.button_text.strip():
                # Check for x-text or x-html
                has_text_attr = any(attr[0] in ['x-text', 'x-html'] for attr in self.button_attrs)
                has_aria_label = any(attr[0] == 'aria-label' or attr[0] == ':aria-label' for attr in self.button_attrs)
                if not has_text_attr and not has_aria_label:
                    print(f"Line {self.line_num}: Empty button without aria-label:")
                    print(f"  Attrs: {self.button_attrs}")

parser = ButtonParser()
with open("index.html") as f:
    parser.feed(f.read())
