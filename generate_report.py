# -*- coding: utf-8 -*-
import os
from odf.opendocument import OpenDocumentText
from odf.style import Style, TextProperties, ParagraphProperties
from odf.text import H, P, Span

def create_report():
    doc = OpenDocumentText()

    # --- STYLE DEFINITIONS ---
    # Document Title Style
    title_style = Style(name="DocTitle", family="paragraph")
    title_style.addElement(TextProperties(fontsize="20pt", fontweight="bold", color="#ff007f", fontfamily="Arial"))
    title_style.addElement(ParagraphProperties(textalign="center", marginbottom="10pt", margintop="20pt"))
    doc.styles.addElement(title_style)

    # Subtitle Style
    subtitle_style = Style(name="DocSubtitle", family="paragraph")
    subtitle_style.addElement(TextProperties(fontsize="14pt", fontstyle="italic", color="#555555", fontfamily="Arial"))
    subtitle_style.addElement(ParagraphProperties(textalign="center", marginbottom="30pt"))
    doc.styles.addElement(subtitle_style)

    # Heading 1 Style
    h1_style = Style(name="Heading1", family="paragraph")
    h1_style.addElement(TextProperties(fontsize="15pt", fontweight="bold", color="#0056b3", fontfamily="Arial"))
    h1_style.addElement(ParagraphProperties(textalign="left", margintop="18pt", marginbottom="8pt"))
    doc.styles.addElement(h1_style)

    # Heading 2 Style
    h2_style = Style(name="Heading2", family="paragraph")
    h2_style.addElement(TextProperties(fontsize="12pt", fontweight="bold", color="#333333", fontfamily="Arial"))
    h2_style.addElement(ParagraphProperties(textalign="left", margintop="12pt", marginbottom="6pt"))
    doc.styles.addElement(h2_style)

    # Body Text Style
    body_style = Style(name="BodyText", family="paragraph")
    body_style.addElement(TextProperties(fontsize="11pt", fontfamily="Calibri", color="#000000"))
    body_style.addElement(ParagraphProperties(textalign="justify", lineheight="125%", marginbottom="8pt"))
    doc.styles.addElement(body_style)

    # Bold inline style
    bold_span = Style(name="BoldSpan", family="text")
    bold_span.addElement(TextProperties(fontweight="bold"))
    doc.styles.addElement(bold_span)

    # --- CONTENT GENERATION ---
    
    # Title & Subtitle
    doc.text.addElement(P(text="MİNİK ELLER ATÖLYESİ", stylename=title_style))
    doc.text.addElement(P(text="Görüntü İşleme Tabanlı Okul Öncesi Yapay Zeka Çizim ve Aktivite Portalı Raporu", stylename=subtitle_style))
    
    # Section 1: Proje Özeti
    doc.text.addElement(H(outlinelevel=1, text="1. PROJE ÖZETİ", stylename=h1_style))
    doc.text.addElement(P(text="Bu proje, okul öncesi dönemdeki (3-6 yaş) çocukların fiziksel fare, klavye veya dokunmatik ekranlar yerine bilgisayar kamerası ve görüntü işleme algoritmaları aracılığıyla temassız bir şekilde dijital çizim ve eğitsel aktiviteler yapabilmesini sağlayan bütünsel bir yazılım portalıdır. Yazılım, gerçek zamanlı görüntü eşleme, el eklem tespiti, vücut iskelet analizi ve yüz mimik takibi tekniklerini kullanarak çocukların ince motor ve kaba motor becerilerini eğlenceli ve etkileşimli bir biçimde geliştirmeyi amaçlamaktadır.", stylename=body_style))
    
    # Section 2: Projenin Amacı ve Önemi
    doc.text.addElement(H(outlinelevel=1, text="2. PROJENİN AMACI VE DERS İÇİN GEÇERLİLİĞİ", stylename=h1_style))
    doc.text.addElement(P(text="Bilgisayarlı Görüntü İşleme (Computer Vision) dersi kapsamında geliştirilen bu proje, ders müfredatında yer alan gerçek zamanlı nesne tespiti, geometrik dönüşümler, piksel bazlı çarpışma kontrolü ve filtreleme tekniklerinin çocuk eğitimi amacıyla pratik bir uygulamaya dönüştürülmüş halidir. Çocukların ekrana dokunmadan sadece işaret parmağını (☝️) havada hareket ettirerek resim yapabilmesi, vücutlarını (omuz, dirsek, baş vb.) sağa sola eğerek düşen nesneleri yakalaması ve yüz mimikleriyle yapay zeka avatarını yönetmesi tamamen görüntü işleme tabanlı algoritmalar üzerine inşa edilmiştir.", stylename=body_style))

    # Section 3: Kullanılan Teknolojiler
    doc.text.addElement(H(outlinelevel=1, text="3. KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER", stylename=h1_style))
    doc.text.addElement(P(text="Sistemin web sürümü platform bağımsız çalışabilecek şekilde modern web standartları ve yapay zeka modelleriyle donatılmıştır:", stylename=body_style))
    
    p_tech = P(stylename=body_style)
    p_tech.addText("- ")
    p_tech.addElement(Span(text="MediaPipe (Google AI):", stylename=bold_span))
    p_tech.addText(" Gerçek zamanlı el eklem tespiti (Hands API), tüm vücut iskelet yapısı (Pose API) ve yüz mimikleri (Face Mesh API) için kullanılan derin öğrenme modelleri.")
    doc.text.addElement(p_tech)
    
    p_tech2 = P(stylename=body_style)
    p_tech2.addText("- ")
    p_tech2.addElement(Span(text="HTML5 Canvas API:", stylename=bold_span))
    p_tech2.addText(" Çizim tuvali işlemleri, neon efektleri, parçacık sistemleri (VFX) ve dinamik arayüz çizimleri için yüksek performanslı rendering motoru.")
    doc.text.addElement(p_tech2)

    p_tech3 = P(stylename=body_style)
    p_tech3.addText("- ")
    p_tech3.addElement(Span(text="Web Audio API:", stylename=bold_span))
    p_tech3.addText(" Çocuğun motivasyonunu artırmak amacıyla gerçek zamanlı sentetik sesler (pop, başarı arpejleri ve göz kırpma tınıları) üreten ses kütüphanesi.")
    doc.text.addElement(p_tech3)

    # Section 4: Görüntü İşleme Teknikleri
    doc.text.addElement(H(outlinelevel=1, text="4. GÖRÜNTÜ İŞLEME VE YAPAY ZEKA ALGORİTMALARI", stylename=h1_style))
    
    doc.text.addElement(H(outlinelevel=2, text="4.1 Gerçek Zamanlı Ayna Görüntüsü Yansıtma (Mirroring)", stylename=h2_style))
    doc.text.addElement(P(text="Kullanıcının kameraya baktığında sağ-sol algısının karışmaması ve doğal bir etkileşim deneyimi yaşaması amacıyla, video akışı ve üzerine çizilen tüm katmanlar yatay eksende (-1, 1) oranında aynalanmaktadır. CSS ve Canvas rendering düzeyinde yapılan bu işlem sayesinde çocuklar kendi hareketlerini ayna karşısındaymış gibi izleyebilirler.", stylename=body_style))

    doc.text.addElement(H(outlinelevel=2, text="4.2 İşaret Parmağı ile Temassız Çizim ve Histerezis Yumuşatma", stylename=h2_style))
    doc.text.addElement(P(text="Çocuğun havada sadece işaret parmağını (☝️) havaya kaldırması el dedektöründen alınan eklem mesafeleriyle tespit edilir. İşaret parmağı açık, orta parmak kapalı olduğunda çizim modu aktifleşir. El titremelerinden veya çocukların parmaklarını sabit tutamamalarından kaynaklanan çizgi kopmalarını (sadece nokta nokta çizilmesi) önlemek amacıyla debouncing (gecikmeli sonlandırma) algoritması uygulanmıştır. Çizim işlemi ancak işaret parmağı 3 kare üst üste kapatıldığında veya orta parmak açıldığında sonlandırılmaktadır.", stylename=body_style))

    doc.text.addElement(H(outlinelevel=2, text="4.3 Bütünsel İskelet Çarpışma Analizi (Pose Collision Detection)", stylename=h2_style))
    doc.text.addElement(P(text="Elma yakalama oyununda, çocuğun sadece kafasıyla değil tüm vücuduyla etkileşime girebilmesi adına MediaPipe Pose modelinden alınan 33 temel eklem noktası (omuzlar, dirsekler, bilekler, kalçalar vb.) takip edilmektedir. Düşen elmaların koordinatları ile bu 33 eklem noktasının her biri arasındaki Öklid uzaklıkları (Euclidean Distance) anlık olarak hesaplanır. Herhangi bir eklem noktasının uzaklığı elma yarıçapına yaklaştığında çarpışma tespit edilir, elma kaybolur, puan kazanılır ve parçacık patlama efekti tetiklenir.", stylename=body_style))

    doc.text.addElement(H(outlinelevel=2, text="4.4 Yüz İfadesi ve Mimik Eşleştirme (Face Mesh & Blendshapes)", stylename=h2_style))
    doc.text.addElement(P(text="Duygu Aynası oyununda, çocukların ekrandaki ifadeleri taklit etmesi istenir. Göz kırpma tespiti için göz kapağı eklem noktalarının oranından EAR (Eye Aspect Ratio) hesaplanır. Gülümseme skoru için ağız köşelerinin genişliği ve yukarı kıvrılma oranları göz dış köşelerine oranlanarak normalize edilir. Bu sayede çocuğun kameraya olan uzaklığından bağımsız, sağlıklı bir mimik algılama mekanizması sunulmaktadır.", stylename=body_style))

    # Section 5: Sistem Modülleri
    doc.text.addElement(H(outlinelevel=1, text="5. UYGULAMA MODÜLLERİ VE OYUNLAR", stylename=h1_style))
    
    p_mod1 = P(stylename=body_style)
    p_mod1.addElement(Span(text="a) Serbest Çizim: ", stylename=bold_span))
    p_mod1.addText("Çocukların havada parmaklarıyla çizim yapabildiği, renk değiştirebildiği, fırça boyutunu ayarlayabildiği ve yaptıklarını bilgisayarlarına kaydedebildiği yaratıcılık tuvalidir.")
    doc.text.addElement(p_mod1)

    p_mod2 = P(stylename=body_style)
    p_mod2.addElement(Span(text="b) Balon Patlatma: ", stylename=bold_span))
    p_mod2.addText("Havaya yükselen renkli neon balonların, çocuğun el imlecini üzerlerine götürmesiyle patlatıldığı kaba motor koordinasyon oyunudur.")
    doc.text.addElement(p_mod2)

    p_mod3 = P(stylename=body_style)
    p_mod3.addElement(Span(text="c) Elma Yakalama: ", stylename=bold_span))
    p_mod3.addText("Yukarıdan düşen elmaları çocuğun tüm vücut iskeletini kullanarak yakaladığı aktif hareket oyunudur. Çocuk ekranda kendi vücudunun parlayan neon iskeletini görebilmektedir.")
    doc.text.addElement(p_mod3)

    p_mod4 = P(stylename=body_style)
    p_mod4.addElement(Span(text="d) Duygu Aynası (Mimik Oyunu): ", stylename=bold_span))
    p_mod4.addText("Çocuğa 'Gülümse', 'Şaşır', 'Göz Kırp' gibi komutlar veren ve çocuğun bu ifadeleri taklit etmesini ölçen duyusal farkındalık modülüdür.")
    doc.text.addElement(p_mod4)

    # Section 6: Değerlendirme ve Sonuç
    doc.text.addElement(H(outlinelevel=1, text="6. SONUÇ VE DEĞERLENDİRME", stylename=h1_style))
    doc.text.addElement(P(text="Geliştirilen 'Minik Eller Atölyesi' projesi, bilgisayarlı görüntü işlemenin eğitim teknolojileriyle entegrasyonu adına başarılı bir örnektir. Sistem, fare veya dokunmatik ekranlara alternatif olarak insan vücudunu bir doğal kullanıcı arayüzüne (Natural User Interface - NUI) dönüştürmektedir. Presel düzeyde yapılan filtreleme ve debouncing algoritmaları sayesinde çocukların el hareketleri akıcı ve hatasız bir şekilde dijital komutlara dönüştürülmektedir. Bu çalışma, okul öncesi çocukların dijital ortamla sağlıklı, aktif ve temassız bir şekilde etkileşime girebileceğini akademik olarak kanıtlamaktadır.", stylename=body_style))

    # Save Document
    output_path = os.path.join(os.path.dirname(__file__), "MinikEller_Atolyesi_Proje_Raporu.odt")
    doc.save(output_path)
    print(f"[BASARI] Rapor olusturuldu: {output_path}")

if __name__ == "__main__":
    create_report()
