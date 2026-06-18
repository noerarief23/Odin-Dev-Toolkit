from html.parser import HTMLParser

class ButtonParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_button = False
        self.button_content = ""
        self.button_attrs = []
        self.line_num = 0

    def handle_starttag(self, tag, attrs):
        if tag == "button":
            self.in_button = True
            self.button_content = ""
            self.button_attrs = attrs
            self.line_num = self.getpos()[0]
        elif self.in_button:
            # We track the HTML inside the button
            attr_str = " ".join(f'{k}="{v}"' if v else k for k, v in attrs)
            self.button_content += f"<{tag} {attr_str}>"

    def handle_data(self, data):
        if self.in_button:
            self.button_content += data

    def handle_endtag(self, tag):
        if self.in_button and tag != "button":
            self.button_content += f"</{tag}>"
        elif tag == "button":
            self.in_button = False

            # Check for x-text or x-html attrs in button
            has_x_text = any(attr[0] in ['x-text', 'x-html'] for attr in self.button_attrs)
            has_aria_label = any(attr[0] == 'aria-label' or attr[0] == ':aria-label' or attr[0] == 'title' or attr[0] == ':title' for attr in self.button_attrs)

            # Check if there is text content or a child with x-text
            content_stripped = self.button_content.strip()
            # Try to strip out HTML tags to see if there's text
            import re
            text_only = re.sub('<[^<]+>', '', content_stripped).strip()

            has_text_in_children = text_only != ""
            has_x_text_in_children = 'x-text=' in content_stripped or 'x-html=' in content_stripped

            if not has_x_text and not has_aria_label and not has_text_in_children and not has_x_text_in_children:
                print(f"Line {self.line_num}: Icon-only button without aria-label/title")
                print(f"  Attrs: {self.button_attrs}")
                print(f"  Content: {self.button_content}")
                print("-" * 40)

parser = ButtonParser()
with open("index.html") as f:
    parser.feed(f.read())
