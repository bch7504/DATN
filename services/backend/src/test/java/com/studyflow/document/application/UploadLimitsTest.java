package com.studyflow.document.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.unit.DataSize;

class UploadLimitsTest {
    /**
     * No args. Input: packaged application defaults, not local environment/secrets.
     * Output: void; checks servlet limits permit both a 20 MiB material and 25 MiB of assignment files
     * plus multipart overhead. Assertion failures flag incompatible configuration; no network/storage I/O.
     */
    @Test
    void servletLimitsPermitBothMaterialAndMultiFileAssignmentUploads() {
        YamlPropertiesFactoryBean loader = new YamlPropertiesFactoryBean();
        loader.setResources(new ClassPathResource("application.yml"));
        Properties properties = loader.getObject();
        assertThat(properties).isNotNull();
        long fileLimit = DataSize.parse(properties.getProperty("spring.servlet.multipart.max-file-size")).toBytes();
        long requestLimit = DataSize.parse(properties.getProperty("spring.servlet.multipart.max-request-size")).toBytes();
        assertThat(fileLimit).isGreaterThanOrEqualTo(DataSize.ofMegabytes(20).toBytes());
        assertThat(requestLimit).isGreaterThanOrEqualTo(DataSize.ofMegabytes(26).toBytes());
    }
}
