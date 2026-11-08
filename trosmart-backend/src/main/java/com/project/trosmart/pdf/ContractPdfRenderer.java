package com.project.trosmart.pdf;

import com.openhtmltopdf.extend.FSSupplier;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.exception.AppException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Locale;

/**
 * Điền dữ liệu vào mẫu HTML (templates/contract/contract-pdf.html) rồi chuyển thành PDF khổ A4.
 * Mẫu phải là XHTML hợp lệ (đóng đủ thẻ, không dùng &nbsp;) vì OpenHTMLtoPDF đọc bằng bộ phân tích XML.
 */
@Slf4j
@Component
public class ContractPdfRenderer {

    private static final String TEMPLATE_NAME = "contract/contract-pdf";

    // Liberation Serif tương thích kích thước với Times New Roman và có đủ chữ tiếng Việt.
    // Phải nhúng font vào PDF, nếu không dấu tiếng Việt sẽ bị mất hoặc thành ô vuông.
    private static final String FONT_FAMILY = "Liberation Serif";

    private final TemplateEngine templateEngine;

    public ContractPdfRenderer() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(true);

        this.templateEngine = new TemplateEngine();
        this.templateEngine.setTemplateResolver(resolver);
    }

    public byte[] render(ContractPdfData data) {
        Context context = new Context(Locale.forLanguageTag("vi-VN"));
        context.setVariable("c", data);

        String html = templateEngine.process(TEMPLATE_NAME, context);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();

            addFont(builder, "LiberationSerif-Regular.ttf", 400, PdfRendererBuilder.FontStyle.NORMAL);
            addFont(builder, "LiberationSerif-Bold.ttf", 700, PdfRendererBuilder.FontStyle.NORMAL);
            addFont(builder, "LiberationSerif-Italic.ttf", 400, PdfRendererBuilder.FontStyle.ITALIC);
            addFont(builder, "LiberationSerif-BoldItalic.ttf", 700, PdfRendererBuilder.FontStyle.ITALIC);

            builder.withHtmlContent(html, null);
            builder.toStream(out);
            builder.run();

            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to render contract PDF: {}", data.getContractCode(), e);
            throw new AppException(ErrorCode.CONTRACT_PDF_EXPORT_FAILED);
        }
    }

    private void addFont(PdfRendererBuilder builder, String file, int weight, PdfRendererBuilder.FontStyle style) {
        String path = "/fonts/" + file;

        FSSupplier<InputStream> supplier = () -> {
            InputStream stream = ContractPdfRenderer.class.getResourceAsStream(path);

            if (stream == null) {
                throw new IllegalStateException("Không tìm thấy font " + path + " trong resources");
            }

            return stream;
        };

        builder.useFont(supplier, FONT_FAMILY, weight, style, true);
    }
}
