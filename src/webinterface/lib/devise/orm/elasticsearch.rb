require 'orm_adapter/adapters/elasticsearch'

module Devise
  module Orm
    module Elasticsearch

      module Hook
        def devise_modules_hook!
          include Compatibility
          yield
        end
      end

      module Compatibility
        extend ActiveSupport::Concern

        module ClassMethods

          def validates_uniqueness_of(*fields)
            validates_with Validations::UniquenessValidator
            true
          end

        end
      end

      module Validations

        class UniquenessValidator < ActiveModel::Validator

          attr_reader :klass

          def initialize(options={})
            @klass = options[:class]
            super
          end

          def validate(record)
            return unless validation_required?(record, :email)
            if klass.all(query: { term: { email: record.email.downcase } }, size: 1).count > 0
              add_error(record, :email, record.email)
            end
          end

          private

          def add_error(document, attribute, value)
            document.errors.add(
              attribute, :taken, { value: value }
            )
          end

          def validation_required?(document, attribute)
            (document.new_record? ||
              document.send("#{attribute.to_s}_changed?")) && !document[attribute].nil?
          end
        end

      end

    end
  end
end